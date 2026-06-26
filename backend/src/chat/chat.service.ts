import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { AiService, ChatTurn } from '../ai/ai.service';
import { FinanceRagService } from './finance-rag.service';

const SYSTEM_PROMPT = `Você é o assistente financeiro do CasalCost, um aplicativo de controle de gastos.
Seu papel é ajudar EXCLUSIVAMENTE o usuário atual a entender as próprias finanças, com base apenas nos dados fornecidos no contexto.

Regras de conteúdo:
- Responda sempre em português do Brasil, de forma clara, objetiva e amigável.
- Use somente os dados do contexto (resumo ao vivo + conhecimento recuperado). Nunca invente valores, contas ou datas.
- Quando faltar informação para responder com precisão, diga o que falta de forma transparente.
- Valores são em Reais (R$). Seja concreto com números quando eles existirem no contexto.
- Dê insights úteis: tendências de gastos, categorias que mais pesam, contas a vencer, metas de economia realistas e planos de ação.
- Quando houver dados de extrato bancário importado, responda com base neles: gastos por estabelecimento, categorias, recorrentes, investimentos RDB/CDB e resgates. Use o bloco "Extrato bancário" como fonte principal para perguntas sobre o banco.
- Priorize SEMPRE o contexto ensinado pelo usuário no detalhamento (regras de estabelecimento/pessoa) sobre suposições genéricas ou categorização automática.
- Se o usuário ensinou que um Pix ou transferência é reforço de curso, aluguel, etc., use essa explicação — não trate como gasto genérico.
- Se um lançamento recorrente não tiver motivo conhecido no contexto, pergunte de forma objetiva o que é (ex.: "Para quem é o Pix para Vinicios?").
- Entrada que não saiu no mesmo mês e foi aplicada em RDB deve ser tratada como investimento. Resgates parciais devem ser relacionados às aplicações anteriores.
- Quando o usuário pedir metas ou planos, proponha passos práticos com base no saldo e nas despesas reais dele.
- Não revele dados de outros usuários nem detalhes técnicos internos do sistema.

Formato de resposta (sempre siga este padrão):
1. Abra com 1–2 frases de resumo direto.
2. Organize o restante em seções curtas com título em negrito e um emoji fixo por tipo:
   - **📊 Visão geral** — panorama e números principais
   - **💰 Valores** — montantes, saldos e comparações
   - **📅 Prazos** — vencimentos e datas relevantes
   - **💡 Recomendações** — ações práticas e próximos passos
   - **⚠️ Atenção** — alertas ou riscos (só quando houver)
3. Dentro de cada seção, use marcadores (- ) para os pontos importantes (máx. 4 por seção).
4. Use emojis com moderação: 1 no título de cada seção; evite emojis soltos no meio das frases.
5. Use **negrito** apenas para títulos de seção e valores ou datas críticas.
6. Mantenha respostas concisas (~150–250 palavras), salvo se o usuário pedir mais detalhes.
7. Encerre, quando fizer sentido, com uma frase curta de encorajamento ou um próximo passo claro.`;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly rag: FinanceRagService,
  ) {}

  private async buildAskMessages(userId: string, message: string) {
    await this.rag.ensureIndex(userId);

    const [queryEmbedding, liveSummary, bankContext, recent] = await Promise.all([
      this.ai.embedOne(message),
      this.rag.buildLiveSummary(userId),
      this.rag.buildBankStatementContext(userId),
      this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const chunks = await this.rag.retrieveForChat(userId, queryEmbedding, message);
    const history = recent.reverse();

    const context = `Resumo ao vivo das finanças do usuário:\n${
      liveSummary || 'Sem movimentações recentes.'
    }\n\nExtrato bancário e contexto ensinado (sempre consulte para perguntas sobre gastos do banco):\n${
      bankContext || 'Nenhum extrato importado.'
    }\n\nConhecimento adicional recuperado:\n${
      chunks.length ? chunks.map((c) => `- ${c}`).join('\n') : '- (nenhum)'
    }`;

    const messages: ChatTurn[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: context },
      ...history.map((m) => ({
        role: m.role === ChatRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    return messages;
  }

  private saveMessages(userId: string, message: string, reply: string) {
    return this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { userId, role: ChatRole.USER, content: message },
      }),
      this.prisma.chatMessage.create({
        data: { userId, role: ChatRole.ASSISTANT, content: reply },
      }),
    ]);
  }

  async history(userId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return ok(messages, 'Operation completed successfully');
  }

  async clearHistory(userId: string) {
    await this.prisma.chatMessage.deleteMany({ where: { userId } });
    return ok({ cleared: true }, 'Conversa limpa com sucesso.');
  }

  async reindex(userId: string) {
    if (!this.ai.enabled) {
      throw new ServiceUnavailableException(
        'Assistente de IA indisponível (OPENAI_API_KEY não configurada).',
      );
    }
    const count = await this.rag.reindex(userId);
    return ok({ indexed: count }, 'Operation completed successfully');
  }

  async ask(userId: string, message: string) {
    if (!this.ai.enabled) {
      throw new ServiceUnavailableException(
        'Assistente de IA indisponível (OPENAI_API_KEY não configurada).',
      );
    }

    const messages = await this.buildAskMessages(userId, message);
    const reply = await this.ai.complete(messages);
    await this.saveMessages(userId, message, reply);

    return ok({ reply }, 'Operation completed successfully');
  }

  async *askStream(userId: string, message: string): AsyncGenerator<string> {
    if (!this.ai.enabled) {
      throw new ServiceUnavailableException(
        'Assistente de IA indisponível (OPENAI_API_KEY não configurada).',
      );
    }

    const messages = await this.buildAskMessages(userId, message);
    let reply = '';

    for await (const chunk of this.ai.streamComplete(messages)) {
      reply += chunk;
      yield chunk;
    }

    await this.saveMessages(userId, message, reply.trim());
  }
}
