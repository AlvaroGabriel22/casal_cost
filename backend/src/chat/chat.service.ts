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

Regras:
- Responda sempre em português do Brasil, de forma clara, objetiva e amigável.
- Use somente os dados do contexto (resumo ao vivo + conhecimento recuperado). Nunca invente valores, contas ou datas.
- Quando faltar informação para responder com precisão, diga o que falta de forma transparente.
- Valores são em Reais (R$). Seja concreto com números quando eles existirem no contexto.
- Dê insights úteis: tendências de gastos, categorias que mais pesam, contas a vencer, metas de economia realistas e planos de ação.
- Quando o usuário pedir metas ou planos, proponha passos práticos com base no saldo e nas despesas reais dele.
- Não revele dados de outros usuários nem detalhes técnicos internos do sistema.`;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly rag: FinanceRagService,
  ) {}

  async history(userId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return ok(messages, 'Operation completed successfully');
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

    await this.rag.ensureIndex(userId);

    const [queryEmbedding, liveSummary, recent] = await Promise.all([
      this.ai.embedOne(message),
      this.rag.buildLiveSummary(userId),
      this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const chunks = await this.rag.retrieve(userId, queryEmbedding, 8);
    const history = recent.reverse();

    const context = `Resumo ao vivo das finanças do usuário:\n${
      liveSummary || 'Sem movimentações recentes.'
    }\n\nConhecimento recuperado dos dados do usuário:\n${
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

    const reply = await this.ai.complete(messages);

    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { userId, role: ChatRole.USER, content: message },
      }),
      this.prisma.chatMessage.create({
        data: { userId, role: ChatRole.ASSISTANT, content: reply },
      }),
    ]);

    return ok({ reply }, 'Operation completed successfully');
  }
}
