import { Injectable, NotFoundException } from '@nestjs/common';
import { FinanceContextQuestionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankRecurringExpense,
  BankSpendingAnalysis,
} from '../insights/bank-statement-analysis.service';
import { inferSpendingCategory } from '../statement-imports/parsers/category-guess';
import { normalizeMatchLabel } from './finance-context.matcher';
import { UpsertFinanceContextRuleDto } from './dto/finance-context.dto';

export interface FinanceContextRuleDto {
  id: string;
  matchLabel: string;
  displayLabel: string;
  category: string | null;
  motive: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface FinanceContextQuestionDto {
  id: string;
  matchLabel: string;
  displayLabel: string;
  sampleAmount: number | null;
  occurrences: number;
  prompt: string;
}

export interface FinanceContextPayload {
  rules: FinanceContextRuleDto[];
  questions: FinanceContextQuestionDto[];
}

@Injectable()
export class FinanceContextService {
  constructor(private readonly prisma: PrismaService) {}

  async listRules(userId: string): Promise<FinanceContextRuleDto[]> {
    const rows = await this.prisma.financeContextRule.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.toRuleDto(r));
  }

  async getPayload(userId: string): Promise<FinanceContextPayload> {
    const [rules, questions] = await Promise.all([
      this.listRules(userId),
      this.listOpenQuestions(userId),
    ]);
    return { rules, questions };
  }

  async listOpenQuestions(userId: string): Promise<FinanceContextQuestionDto[]> {
    const rows = await this.prisma.financeContextQuestion.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: [{ occurrences: 'desc' }, { updatedAt: 'desc' }],
      take: 8,
    });
    return rows.map((q) => this.toQuestionDto(q));
  }

  async createRule(userId: string, dto: UpsertFinanceContextRuleDto) {
    const matchLabel = normalizeMatchLabel(dto.displayLabel);
    const row = await this.prisma.financeContextRule.upsert({
      where: { userId_matchLabel: { userId, matchLabel } },
      create: {
        userId,
        matchLabel,
        displayLabel: dto.displayLabel.trim(),
        category: dto.category?.trim() || null,
        motive: dto.motive.trim(),
        isRecurring: dto.isRecurring ?? true,
      },
      update: {
        displayLabel: dto.displayLabel.trim(),
        category: dto.category?.trim() || null,
        motive: dto.motive.trim(),
        isRecurring: dto.isRecurring ?? true,
      },
    });

    await this.prisma.financeContextQuestion.updateMany({
      where: { userId, matchLabel, status: 'OPEN' },
      data: { status: 'ANSWERED' },
    });

    await this.touchRuleSideEffects(userId);
    return this.toRuleDto(row);
  }

  async updateRule(userId: string, ruleId: string, dto: UpsertFinanceContextRuleDto) {
    const existing = await this.prisma.financeContextRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada');

    const matchLabel = normalizeMatchLabel(dto.displayLabel);
    const row = await this.prisma.financeContextRule.update({
      where: { id: ruleId },
      data: {
        matchLabel,
        displayLabel: dto.displayLabel.trim(),
        category: dto.category?.trim() || null,
        motive: dto.motive.trim(),
        isRecurring: dto.isRecurring ?? true,
      },
    });
    await this.touchRuleSideEffects(userId);
    return this.toRuleDto(row);
  }

  async deleteRule(userId: string, ruleId: string) {
    const existing = await this.prisma.financeContextRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada');
    await this.prisma.financeContextRule.delete({ where: { id: ruleId } });
    await this.touchRuleSideEffects(userId);
    return { deleted: true };
  }

  async answerQuestion(
    userId: string,
    questionId: string,
    dto: UpsertFinanceContextRuleDto,
  ) {
    const question = await this.prisma.financeContextQuestion.findFirst({
      where: { id: questionId, userId, status: 'OPEN' },
    });
    if (!question) throw new NotFoundException('Pergunta não encontrada');

    const rule = await this.createRule(userId, {
      displayLabel: dto.displayLabel || question.displayLabel,
      motive: dto.motive,
      category: dto.category,
      isRecurring: dto.isRecurring ?? true,
    });

    await this.prisma.financeContextQuestion.update({
      where: { id: questionId },
      data: { status: 'ANSWERED' },
    });

    return rule;
  }

  async dismissQuestion(userId: string, questionId: string) {
    const question = await this.prisma.financeContextQuestion.findFirst({
      where: { id: questionId, userId, status: 'OPEN' },
    });
    if (!question) throw new NotFoundException('Pergunta não encontrada');
    await this.prisma.financeContextQuestion.update({
      where: { id: questionId },
      data: { status: 'DISMISSED' },
    });
    return { dismissed: true };
  }

  /** Gera perguntas para lançamentos recorrentes sem contexto do usuário. */
  async syncQuestionsFromSpending(
    userId: string,
    spending: BankSpendingAnalysis | null,
  ): Promise<void> {
    if (!spending) return;

    const rules = await this.prisma.financeContextRule.findMany({
      where: { userId },
      select: { matchLabel: true },
    });
    const known = new Set(rules.map((r) => r.matchLabel));

    const dismissed = await this.prisma.financeContextQuestion.findMany({
      where: { userId, status: 'DISMISSED' },
      select: { matchLabel: true },
    });
    const dismissedSet = new Set(dismissed.map((d) => d.matchLabel));

    const candidates = this.pickQuestionCandidates(spending.recurringExpenses, known, dismissedSet);

    for (const c of candidates) {
      const existing = await this.prisma.financeContextQuestion.findUnique({
        where: { userId_matchLabel: { userId, matchLabel: c.matchLabel } },
      });
      if (existing?.status === 'DISMISSED') continue;

      await this.prisma.financeContextQuestion.upsert({
        where: { userId_matchLabel: { userId, matchLabel: c.matchLabel } },
        create: {
          userId,
          matchLabel: c.matchLabel,
          displayLabel: c.displayLabel,
          sampleAmount: c.sampleAmount,
          occurrences: c.occurrences,
          status: 'OPEN',
        },
        update: {
          displayLabel: c.displayLabel,
          sampleAmount: c.sampleAmount,
          occurrences: c.occurrences,
          ...(existing?.status === 'ANSWERED' ? {} : { status: 'OPEN' }),
        },
      });
    }
  }

  formatRulesForRag(rules: FinanceContextRuleDto[]): string[] {
    return rules.map(
      (r) =>
        `[Gasto explicado pelo usuário] "${r.displayLabel}": ${r.motive}${r.category ? ` | categoria: ${r.category}` : ''}${r.isRecurring ? ' | recorrente' : ''}. Use esta explicação ao responder sobre transferências ou estabelecimentos com esse nome.`,
    );
  }

  /** Força reindexação do chat na próxima mensagem (após ensinar gasto). */
  async invalidateRagIndex(userId: string): Promise<void> {
    await this.prisma.financeIndexState.deleteMany({ where: { userId } });
  }

  private async touchRuleSideEffects(userId: string) {
    await this.invalidateRagIndex(userId);
  }

  private pickQuestionCandidates(
    recurring: BankRecurringExpense[],
    known: Set<string>,
    dismissed: Set<string>,
  ) {
    const out: Array<{
      matchLabel: string;
      displayLabel: string;
      sampleAmount: number;
      occurrences: number;
      score: number;
    }> = [];

    for (const rec of recurring) {
      if (rec.occurrences < 2) continue;
      const matchLabel = normalizeMatchLabel(rec.label);
      if (!matchLabel || known.has(matchLabel) || dismissed.has(matchLabel)) continue;

      const autoCategory = inferSpendingCategory(rec.label);
      const isTransfer = rec.category === 'Transferências' || autoCategory === 'Transferências';
      const isUnknown = rec.category === 'Outros' || autoCategory === 'Outros';
      if (!isTransfer && !isUnknown) continue;

      let score = rec.totalInPeriod;
      if (isTransfer) score += 500;
      if (rec.isCrossMonthRecurring) score += 300;

      out.push({
        matchLabel,
        displayLabel: rec.label,
        sampleAmount: rec.averageAmount,
        occurrences: rec.occurrences,
        score,
      });
    }

    return out
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  private toRuleDto(row: {
    id: string;
    matchLabel: string;
    displayLabel: string;
    category: string | null;
    motive: string;
    isRecurring: boolean;
    createdAt: Date;
  }): FinanceContextRuleDto {
    return {
      id: row.id,
      matchLabel: row.matchLabel,
      displayLabel: row.displayLabel,
      category: row.category,
      motive: row.motive,
      isRecurring: row.isRecurring,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toQuestionDto(row: {
    id: string;
    matchLabel: string;
    displayLabel: string;
    sampleAmount: { toNumber?: () => number } | null;
    occurrences: number;
  }): FinanceContextQuestionDto {
    const amount =
      row.sampleAmount != null ? Number(row.sampleAmount) : null;
    const amountText =
      amount != null ? ` (~${this.brl(amount)} por vez)` : '';
    return {
      id: row.id,
      matchLabel: row.matchLabel,
      displayLabel: row.displayLabel,
      sampleAmount: amount,
      occurrences: row.occurrences,
      prompt: `Você paga ${row.displayLabel} com frequência${amountText} (${row.occurrences}x). Qual o motivo?`,
    };
  }

  private brl(value: number) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }
}
