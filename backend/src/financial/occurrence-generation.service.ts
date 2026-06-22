import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ExpenseStatus,
  Prisma,
  RecurrenceFrequency,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OccurrenceGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  private monthAt(y: number, monthIndex0: number): Date {
    return new Date(Date.UTC(y, monthIndex0, 1));
  }

  /** Ensure FIXED / RECURRING (MONTHLY) has an occurrence for reference month. */
  async ensureMonthlyOccurrence(params: {
    expenseId: string;
    userId: string;
    coupleId: string | null;
    referenceMonth: Date;
    amount: Prisma.Decimal | string;
    dueDay: number;
  }) {
    const y = params.referenceMonth.getUTCFullYear();
    const m = params.referenceMonth.getUTCMonth();
    const ref = this.monthAt(y, m);

    const exists = await this.prisma.expenseOccurrence.findUnique({
      where: {
        expenseId_referenceMonth: {
          expenseId: params.expenseId,
          referenceMonth: ref,
        },
      },
    });
    if (exists) {
      throw new BadRequestException(
        'Já existe um lançamento desta despesa para o mês informado.',
      );
    }
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const day = Math.min(params.dueDay, lastDay);
    const dueDate = new Date(Date.UTC(y, m, day));

    await this.prisma.expenseOccurrence.create({
      data: {
        expenseId: params.expenseId,
        userId: params.userId,
        coupleId: params.coupleId,
        referenceMonth: ref,
        dueDate,
        amount: new Prisma.Decimal(params.amount as string),
        status: ExpenseStatus.PENDING,
      },
    });
  }

  async generateInstallmentOccurrences(params: {
    expenseId: string;
    userId: string;
    coupleId: string | null;
    installmentAmount: Prisma.Decimal;
    totalInstallments: number;
    firstReferenceMonth: Date;
    dueDay?: number;
  }) {
    const dueDay = params.dueDay ?? 10;
    const y0 = params.firstReferenceMonth.getUTCFullYear();
    const m0 = params.firstReferenceMonth.getUTCMonth();

    for (let i = 0; i < params.totalInstallments; i++) {
      const ref = this.monthAt(y0, m0 + i);
      await this.prisma.expenseOccurrence.create({
        data: {
          expenseId: params.expenseId,
          userId: params.userId,
          coupleId: params.coupleId,
          referenceMonth: ref,
          dueDate: (() => {
            const ly = ref.getUTCFullYear();
            const lm = ref.getUTCMonth();
            const lastDay = new Date(Date.UTC(ly, lm + 1, 0)).getUTCDate();
            const day = Math.min(dueDay, lastDay);
            return new Date(Date.UTC(ly, lm, day));
          })(),
          amount: params.installmentAmount,
          status: ExpenseStatus.PENDING,
          installmentNumber: i + 1,
          totalInstallments: params.totalInstallments,
        },
      });
    }
  }

  /** MVP: MONTHLY only — expand rule window for a given month. */
  async expandRecurringForMonth(expenseId: string, referenceMonth: Date) {
    const rule = await this.prisma.recurrenceRule.findUnique({
      where: { expenseId },
      include: { expense: true },
    });
    if (!rule || rule.frequency !== RecurrenceFrequency.MONTHLY) return;

    const start = rule.startDate;
    const end = rule.endDate;
    const m0 = this.atMonthStart(referenceMonth);
    if (m0 < this.atMonthStart(start)) return;
    if (end && m0 > this.atMonthEnd(end)) return;

    const exists = await this.prisma.expenseOccurrence.findUnique({
      where: {
        expenseId_referenceMonth: { expenseId, referenceMonth: m0 },
      },
    });
    if (exists) return;

    const day = rule.dayOfMonth ?? 1;
    const y = m0.getUTCFullYear();
    const mi = m0.getUTCMonth();
    const lastDay = new Date(Date.UTC(y, mi + 1, 0)).getUTCDate();
    const d = Math.min(day, lastDay);
    const dueDate = new Date(Date.UTC(y, mi, d));

    await this.prisma.expenseOccurrence.create({
      data: {
        expenseId,
        userId: rule.expense.ownerUserId!,
        coupleId: rule.expense.coupleId,
        referenceMonth: m0,
        dueDate,
        amount: rule.expense.totalAmount,
        status: ExpenseStatus.PENDING,
      },
    });
  }

  private atMonthStart(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private atMonthEnd(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  }

  async createOneTimeOccurrence(params: {
    expenseId: string;
    userId: string;
    coupleId: string | null;
    referenceMonth: Date;
    amount: Prisma.Decimal;
    dueDate: Date;
  }) {
    await this.prisma.expenseOccurrence.create({
      data: {
        expenseId: params.expenseId,
        userId: params.userId,
        coupleId: params.coupleId,
        referenceMonth: params.referenceMonth,
        dueDate: params.dueDate,
        amount: params.amount,
        status: ExpenseStatus.PENDING,
      },
    });
  }
}
