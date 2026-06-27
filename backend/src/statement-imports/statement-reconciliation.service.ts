import { Injectable, Logger } from '@nestjs/common';
import {
  ExpenseScope,
  ExpenseStatus,
  PaymentMethod,
  ReconciliationMatchType,
  StatementSourceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankMovementType,
  classifyBankMovement,
} from '../insights/bank-movement.classifier';

const RECONCILABLE_METHODS: PaymentMethod[] = [
  PaymentMethod.PIX,
  PaymentMethod.BOLETO,
  PaymentMethod.TRANSFER,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.CASH,
  PaymentMethod.OTHER,
];

const AMOUNT_TOLERANCE = 0.02;
const DATE_BEFORE_DAYS = 7;
const DATE_AFTER_DAYS = 21;

export type ReconciliationOverview = {
  month: string;
  summary: {
    awaitingCount: number;
    awaitingTotal: string;
    unmatchedCount: number;
    unmatchedTotal: string;
    confirmedCount: number;
  };
  awaitingExtract: Array<{
    occurrenceId: string;
    title: string;
    amount: string;
    dueDate: string;
    paymentMethod: string;
    status: string;
  }>;
  unmatchedStatementDebits: Array<{
    entryId: string;
    description: string;
    amount: string;
    transactionDate: string;
  }>;
  confirmedMatches: Array<{
    matchId: string;
    title: string;
    entryDescription: string;
    amount: string;
    matchType: ReconciliationMatchType;
    confidence: number;
    paidAt: string;
  }>;
};

@Injectable()
export class StatementReconciliationService {
  private readonly logger = new Logger(StatementReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Runs after bank-account import; matches debits to pending manual bills. */
  async reconcileAfterAccountImport(
    userId: string,
    monthsCovered: string[],
  ): Promise<{ matched: number; skipped: number }> {
    let matched = 0;
    let skipped = 0;

    for (const monthYm of monthsCovered) {
      const result = await this.reconcileMonth(userId, monthYm);
      matched += result.matched;
      skipped += result.skipped;
    }

    return { matched, skipped };
  }

  async getOverview(userId: string, monthYm: string): Promise<ReconciliationOverview> {
    const [y, m] = monthYm.split('-').map(Number);
    const refMonth = new Date(Date.UTC(y, m - 1, 1));

    const [awaitingRows, entries, confirmedRows] = await Promise.all([
      this.prisma.expenseOccurrence.findMany({
        where: {
          deletedAt: null,
          referenceMonth: refMonth,
          status: { in: [ExpenseStatus.PENDING, ExpenseStatus.OVERDUE] },
          reconciliation: null,
          expense: {
            deletedAt: null,
            paymentMethod: { in: RECONCILABLE_METHODS },
            scope: ExpenseScope.INDIVIDUAL,
            ownerUserId: userId,
          },
        },
        include: { expense: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.bankStatementEntry.findMany({
        where: {
          userId,
          deletedAt: null,
          sourceType: StatementSourceType.BANK_ACCOUNT,
          referenceMonth: refMonth,
          direction: 'DEBIT',
        },
        include: { reconciliation: true },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.statementReconciliation.findMany({
        where: {
          userId,
          occurrence: { referenceMonth: refMonth },
        },
        include: {
          occurrence: { include: { expense: true } },
          entry: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unmatchedStatementDebits = entries
      .filter((e) => {
        if (e.reconciliation) return false;
        const type = classifyBankMovement(e.description, 'DEBIT') as BankMovementType;
        return type !== 'INVESTMENT_APPLY' && type !== 'CARD_BILL';
      })
      .map((e) => ({
        entryId: e.id,
        description: e.description,
        amount: Number(e.amount).toFixed(2),
        transactionDate: e.transactionDate.toISOString().slice(0, 10),
      }));

    const awaitingExtract = awaitingRows.map((occ) => ({
      occurrenceId: occ.id,
      title: occ.expense.title,
      amount: Number(occ.amount).toFixed(2),
      dueDate: occ.dueDate.toISOString().slice(0, 10),
      paymentMethod: occ.expense.paymentMethod,
      status: occ.status,
    }));

    const confirmedMatches = confirmedRows.map((row) => ({
      matchId: row.id,
      title: row.occurrence.expense.title,
      entryDescription: row.entry.description,
      amount: Number(row.occurrence.amount).toFixed(2),
      matchType: row.matchType,
      confidence: row.confidence,
      paidAt: (row.occurrence.paymentDate ?? row.entry.transactionDate)
        .toISOString()
        .slice(0, 10),
    }));

    const awaitingTotal = awaitingExtract.reduce((s, r) => s + Number(r.amount), 0);
    const unmatchedTotal = unmatchedStatementDebits.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );

    return {
      month: monthYm,
      summary: {
        awaitingCount: awaitingExtract.length,
        awaitingTotal: awaitingTotal.toFixed(2),
        unmatchedCount: unmatchedStatementDebits.length,
        unmatchedTotal: unmatchedTotal.toFixed(2),
        confirmedCount: confirmedMatches.length,
      },
      awaitingExtract,
      unmatchedStatementDebits,
      confirmedMatches,
    };
  }

  async reconcileMonth(
    userId: string,
    monthYm: string,
  ): Promise<{ matched: number; skipped: number }> {
    const [y, m] = monthYm.split('-').map(Number);
    const refMonth = new Date(Date.UTC(y, m - 1, 1));

    const [entries, occurrences] = await Promise.all([
      this.prisma.bankStatementEntry.findMany({
        where: {
          userId,
          deletedAt: null,
          sourceType: StatementSourceType.BANK_ACCOUNT,
          referenceMonth: refMonth,
          direction: 'DEBIT',
        },
        include: { reconciliation: true },
      }),
      this.prisma.expenseOccurrence.findMany({
        where: {
          deletedAt: null,
          referenceMonth: refMonth,
          status: { in: [ExpenseStatus.PENDING, ExpenseStatus.OVERDUE] },
          expense: {
            deletedAt: null,
            paymentMethod: { in: RECONCILABLE_METHODS },
            OR: [{ scope: ExpenseScope.INDIVIDUAL, ownerUserId: userId }],
          },
          reconciliation: null,
        },
        include: { expense: true },
      }),
    ]);

    const eligibleEntries = entries.filter((e) => {
      if (e.reconciliation) return false;
      const type = classifyBankMovement(e.description, 'DEBIT') as BankMovementType;
      return type !== 'INVESTMENT_APPLY' && type !== 'CARD_BILL';
    });

    const usedOccurrenceIds = new Set<string>();
    let matched = 0;
    let skipped = eligibleEntries.length;

    for (const entry of eligibleEntries) {
      const entryAmount = Number(entry.amount);
      const entryDate = entry.transactionDate;

      const candidates = occurrences
        .filter((occ) => !usedOccurrenceIds.has(occ.id))
        .map((occ) => {
          const occAmount = Number(occ.amount);
          const amountDiff = Math.abs(occAmount - entryAmount);
          if (amountDiff > AMOUNT_TOLERANCE) return null;

          const due = occ.dueDate;
          const minDate = new Date(due);
          minDate.setUTCDate(minDate.getUTCDate() - DATE_BEFORE_DAYS);
          const maxDate = new Date(due);
          maxDate.setUTCDate(maxDate.getUTCDate() + DATE_AFTER_DAYS);

          if (entryDate < minDate || entryDate > maxDate) return null;

          const titleScore = this.titleMatchScore(
            occ.expense.title,
            entry.description,
          );
          const confidence =
            amountDiff < 0.001 ? 90 + titleScore : 70 + titleScore;

          return { occ, confidence, amountDiff };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .sort((a, b) => b.confidence - a.confidence || a.amountDiff - b.amountDiff);

      const best = candidates[0];
      if (!best || best.confidence < 65) continue;

      await this.prisma.$transaction([
        this.prisma.statementReconciliation.create({
          data: {
            userId,
            bankStatementEntryId: entry.id,
            expenseOccurrenceId: best.occ.id,
            matchType: ReconciliationMatchType.AUTO,
            confidence: Math.min(100, Math.round(best.confidence)),
          },
        }),
        this.prisma.expenseOccurrence.update({
          where: { id: best.occ.id },
          data: {
            status: ExpenseStatus.PAID,
            paymentDate: entry.transactionDate,
          },
        }),
      ]);

      usedOccurrenceIds.add(best.occ.id);
      matched += 1;
      skipped -= 1;
    }

    if (matched > 0) {
      this.logger.log(
        `Reconciliados ${matched} lançamento(s) em ${monthYm} para usuário ${userId}`,
      );
    }

    return { matched, skipped };
  }

  /** Revert auto-paid occurrences when account import is deleted. */
  async revertForImport(userId: string, importId: string): Promise<number> {
    const entryIds = (
      await this.prisma.bankStatementEntry.findMany({
        where: { importId, userId },
        select: { id: true },
      })
    ).map((e) => e.id);

    if (entryIds.length === 0) return 0;

    const links = await this.prisma.statementReconciliation.findMany({
      where: {
        userId,
        bankStatementEntryId: { in: entryIds },
        matchType: ReconciliationMatchType.AUTO,
      },
    });

    if (links.length === 0) return 0;

    await this.prisma.$transaction([
      this.prisma.expenseOccurrence.updateMany({
        where: {
          id: { in: links.map((l) => l.expenseOccurrenceId) },
          status: ExpenseStatus.PAID,
        },
        data: {
          status: ExpenseStatus.PENDING,
          paymentDate: null,
        },
      }),
      this.prisma.statementReconciliation.deleteMany({
        where: { id: { in: links.map((l) => l.id) } },
      }),
    ]);

    return links.length;
  }

  private titleMatchScore(title: string, description: string): number {
    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);

    const titleWords = normalize(title);
    const descWords = new Set(normalize(description));
    if (titleWords.length === 0) return 0;

    const hits = titleWords.filter((w) => descWords.has(w)).length;
    return Math.min(10, hits * 5);
  }
}
