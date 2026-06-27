import { Injectable } from '@nestjs/common';
import {
  BankStatementEntry,
  DetectedBank,
  Prisma,
  StatementSourceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankMovementType,
  classifyBankMovement,
} from '../insights/bank-movement.classifier';
import { isWithinNubankBillingPeriod } from './billing-cycle';
import { inferSpendingCategory, isInvestmentMovement } from './parsers/category-guess';

export interface ConfirmedConsumptionMonth {
  month: string;
  total: number;
  accountDebits: number;
  cardDebits: number;
  excludedCardBillTotal: number;
  byCategory: Array<{ category: string; amount: number }>;
  entryCount: number;
}

const SPENDING_TYPES: BankMovementType[] = [
  'EXPENSE',
  'TRANSFER_OUT',
  'CARD_BILL',
  'OTHER',
];

@Injectable()
export class StatementConsolidationService {
  constructor(private readonly prisma: PrismaService) {}

  monthStart(ym: string): Date {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }

  private async resolveDueDay(userId: string): Promise<number> {
    const card = await this.prisma.userCard.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return card?.dueDay ?? 1;
  }

  /** Months with at least one credit-card import entry. */
  async monthsWithCardData(userId: string, monthYms?: string[]): Promise<Set<string>> {
    const where: Prisma.BankStatementEntryWhereInput = {
      userId,
      deletedAt: null,
      sourceType: StatementSourceType.CREDIT_CARD,
    };
    if (monthYms?.length) {
      where.referenceMonth = {
        in: monthYms.map((ym) => this.monthStart(ym)),
      };
    }
    const rows = await this.prisma.bankStatementEntry.findMany({
      where,
      select: { referenceMonth: true },
      distinct: ['referenceMonth'],
    });
    return new Set(
      rows.map(
        (r) =>
          `${r.referenceMonth.getUTCFullYear()}-${String(r.referenceMonth.getUTCMonth() + 1).padStart(2, '0')}`,
      ),
    );
  }

  isConsumptionEntry(
    entry: Pick<
      BankStatementEntry,
      | 'direction'
      | 'description'
      | 'sourceType'
      | 'category'
      | 'transactionDate'
      | 'bank'
    >,
    monthsWithCard: Set<string>,
    monthYm: string,
    dueDay: number,
  ): boolean {
    if (entry.direction !== 'DEBIT') return false;

    const movementType = classifyBankMovement(
      entry.description,
      entry.direction,
    ) as BankMovementType;

    if (movementType === 'INVESTMENT_APPLY') return false;
    if (isInvestmentMovement(entry.description)) return false;
    if (inferSpendingCategory(entry.description) === 'Investimentos') return false;

    if (
      entry.sourceType === StatementSourceType.BANK_ACCOUNT &&
      movementType === 'CARD_BILL' &&
      monthsWithCard.has(monthYm)
    ) {
      return false;
    }

    if (entry.sourceType === StatementSourceType.CREDIT_CARD) {
      if (entry.bank === DetectedBank.NUBANK) {
        if (!isWithinNubankBillingPeriod(entry.transactionDate, monthYm, dueDay)) {
          return false;
        }
      }
      return SPENDING_TYPES.includes(movementType) || movementType === 'EXPENSE';
    }

    if (entry.sourceType === StatementSourceType.BANK_ACCOUNT) {
      return SPENDING_TYPES.includes(movementType);
    }

    return false;
  }

  async getConfirmedConsumption(
    userId: string,
    monthYm: string,
  ): Promise<ConfirmedConsumptionMonth> {
    const month = this.monthStart(monthYm);
    const [entries, monthsWithCard, dueDay] = await Promise.all([
      this.prisma.bankStatementEntry.findMany({
        where: { userId, deletedAt: null, referenceMonth: month },
      }),
      this.monthsWithCardData(userId, [monthYm]),
      this.resolveDueDay(userId),
    ]);

    let accountDebits = 0;
    let cardDebits = 0;
    let excludedCardBillTotal = 0;
    const byCategory = new Map<string, number>();

    for (const entry of entries) {
      const amount = Number(entry.amount);
      const movementType = classifyBankMovement(
        entry.description,
        entry.direction,
      ) as BankMovementType;

      if (
        entry.sourceType === StatementSourceType.BANK_ACCOUNT &&
        movementType === 'CARD_BILL' &&
        monthsWithCard.has(monthYm)
      ) {
        excludedCardBillTotal += amount;
        continue;
      }

      if (!this.isConsumptionEntry(entry, monthsWithCard, monthYm, dueDay)) continue;

      if (entry.sourceType === StatementSourceType.CREDIT_CARD) {
        cardDebits += amount;
      } else {
        accountDebits += amount;
      }

      const category = entry.category ?? inferSpendingCategory(entry.description);
      byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
    }

    const total = accountDebits + cardDebits;

    return {
      month: monthYm,
      total,
      accountDebits,
      cardDebits,
      excludedCardBillTotal,
      byCategory: [...byCategory.entries()]
        .map(([category, amount]) => ({ category, amount: this.round(amount) }))
        .sort((a, b) => b.amount - a.amount),
      entryCount: entries.filter((e) =>
        this.isConsumptionEntry(e, monthsWithCard, monthYm, dueDay),
      ).length,
    };
  }

  /** Saídas do extrato de cartão no mês de referência (fatura). */
  async getCardStatementOutflows(
    userId: string,
    monthYm: string,
  ): Promise<{ total: number; entryCount: number }> {
    const month = this.monthStart(monthYm);
    const entries = await this.prisma.bankStatementEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        sourceType: StatementSourceType.CREDIT_CARD,
        referenceMonth: month,
        direction: 'DEBIT',
      },
    });

    const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

    return { total: this.round(total), entryCount: entries.length };
  }

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }
}
