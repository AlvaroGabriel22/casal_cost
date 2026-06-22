import { Injectable } from '@nestjs/common';
import {
  ExpenseScope,
  ExpenseStatus,
  IncomeType,
  Prisma,
  RecurrenceFrequency,
  SplitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { OccurrenceGenerationService } from './occurrence-generation.service';

export type FinancialStatusLabel = 'POSITIVE' | 'ATTENTION' | 'NEGATIVE';
export type IndividualStatementSource = 'ALL' | 'INDIVIDUAL' | 'SHARED';

@Injectable()
export class FinancialCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permission: PermissionService,
    private readonly occurrences: OccurrenceGenerationService,
  ) {}

  monthStart(ym: string): Date {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m || m < 1 || m > 12) throw new Error('Invalid month YYYY-MM');
    return new Date(Date.UTC(y, m - 1, 1));
  }

  private atStartOfDay(d: Date): Date {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  private atMonthStart(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  effectiveOccurrenceStatus(
    status: ExpenseStatus,
    dueDate: Date,
    asOf: Date = new Date(),
  ): ExpenseStatus {
    if (status !== ExpenseStatus.PENDING) return status;
    if (this.atStartOfDay(dueDate) < this.atStartOfDay(asOf))
      return ExpenseStatus.OVERDUE;
    return status;
  }

  async calculateSharedExpenseResponsibility(
    expenseId: string,
    fullAmount: Prisma.Decimal,
    userId: string,
  ): Promise<Prisma.Decimal> {
    const splits = await this.prisma.sharedExpenseSplit.findMany({
      where: { expenseId },
    });
    if (splits.length === 0) {
      return fullAmount.div(2);
    }
    const mine = splits.find((s) => s.userId === userId);
    if (!mine) {
      throw new Error('Split rows must include both partners');
    }
    if (mine.splitType === SplitType.FIXED_AMOUNT && mine.fixedAmount) {
      return mine.fixedAmount;
    }
    if (mine.splitType === SplitType.PERCENTAGE && mine.percentage) {
      return fullAmount.mul(mine.percentage).div(100);
    }
    if (mine.splitType === SplitType.EQUAL) {
      return fullAmount.div(splits.length);
    }
    return fullAmount.div(2);
  }

  /** Incomes counted for reference month (extra vs recurring rules). */
  private incomeAppliesToMonth(
    row: {
      isRecurring: boolean;
      referenceMonth: Date;
      recurrenceStartDate: Date | null;
      recurrenceEndDate: Date | null;
    },
    month: Date,
  ): boolean {
    const m0 = this.atMonthStart(month);
    if (!row.isRecurring) {
      return (
        row.referenceMonth.getUTCFullYear() === m0.getUTCFullYear() &&
        row.referenceMonth.getUTCMonth() === m0.getUTCMonth()
      );
    }
    const start = row.recurrenceStartDate
      ? this.atMonthStart(row.recurrenceStartDate)
      : this.atMonthStart(row.referenceMonth);
    const end = row.recurrenceEndDate
      ? this.atMonthStart(row.recurrenceEndDate)
      : null;
    if (m0 < start) return false;
    if (end && m0 > end) return false;
    return true;
  }

  private async ensureRecurringOccurrencesForIndividualMonth(
    userId: string,
    coupleId: string | null,
    month: Date,
  ) {
    const rules = await this.prisma.recurrenceRule.findMany({
      where: {
        frequency: RecurrenceFrequency.MONTHLY,
        expense: {
          deletedAt: null,
          OR: [
            { scope: ExpenseScope.INDIVIDUAL, ownerUserId: userId },
            ...(coupleId ? [{ scope: ExpenseScope.SHARED, coupleId }] : []),
          ],
        },
      },
      select: { expenseId: true },
    });

    for (const rule of rules) {
      await this.occurrences.expandRecurringForMonth(rule.expenseId, month);
    }
  }

  private async ensureRecurringOccurrencesForCoupleMonth(
    coupleId: string,
    month: Date,
  ) {
    const rules = await this.prisma.recurrenceRule.findMany({
      where: {
        frequency: RecurrenceFrequency.MONTHLY,
        expense: {
          deletedAt: null,
          scope: ExpenseScope.SHARED,
          coupleId,
        },
      },
      select: { expenseId: true },
    });

    for (const rule of rules) {
      await this.occurrences.expandRecurringForMonth(rule.expenseId, month);
    }
  }

  getFinancialStatus(
    totalIncome: Prisma.Decimal,
    totalExpenses: Prisma.Decimal,
  ): FinancialStatusLabel {
    const balance = totalIncome.sub(totalExpenses);
    if (balance.lt(0)) return 'NEGATIVE';
    if (totalIncome.eq(0)) return 'POSITIVE';
    const ratio = totalExpenses.div(totalIncome);
    if (ratio.greaterThanOrEqualTo(0.8)) return 'ATTENTION';
    return 'POSITIVE';
  }

  async calculateIncome(
    userId: string,
    month: Date,
    baseSalary: Prisma.Decimal,
  ) {
    const incomes = await this.prisma.income.findMany({
      where: { userId, deletedAt: null },
    });
    let extraMonth = new Prisma.Decimal(0);
    let salaryExtras = new Prisma.Decimal(0);
    for (const inc of incomes) {
      if (!this.incomeAppliesToMonth(inc, month)) continue;
      if (inc.type === IncomeType.SALARY) {
        salaryExtras = salaryExtras.add(inc.amount);
      } else {
        extraMonth = extraMonth.add(inc.amount);
      }
    }
    const totalIncome = baseSalary.add(extraMonth).add(salaryExtras);
    return {
      baseSalaryMonth: baseSalary,
      extraIncomeMonth: extraMonth.add(salaryExtras),
      totalIncomeMonth: totalIncome,
    };
  }

  async calculateIndividualMonth(userId: string, monthYm: string) {
    const month = this.monthStart(monthYm);
    const settings = await this.prisma.financialSettings.findUnique({
      where: { userId },
    });
    const baseSalary = settings?.baseSalary ?? new Prisma.Decimal(0);
    const incomeBlock = await this.calculateIncome(userId, month, baseSalary);

    const couple = await this.permission.getActiveCoupleForUser(userId);
    await this.ensureRecurringOccurrencesForIndividualMonth(
      userId,
      couple?.coupleId ?? null,
      month,
    );

    const occurrences = await this.prisma.expenseOccurrence.findMany({
      where: {
        deletedAt: null,
        referenceMonth: month,
      },
      include: {
        expense: {
          include: { sharedSplits: true },
        },
      },
    });

    let totalIndividual = new Prisma.Decimal(0);
    let totalSharedResp = new Prisma.Decimal(0);
    const byCat = new Map<string, Prisma.Decimal>();

    for (const occ of occurrences) {
      const ex = occ.expense;
      if (ex.deletedAt) continue;

      if (ex.scope === ExpenseScope.INDIVIDUAL) {
        if (ex.ownerUserId !== userId) continue;
        const st = this.effectiveOccurrenceStatus(occ.status, occ.dueDate);
        if (st === ExpenseStatus.CANCELLED) continue;
        totalIndividual = totalIndividual.add(occ.amount);
        byCat.set(
          ex.category,
          (byCat.get(ex.category) ?? new Prisma.Decimal(0)).add(occ.amount),
        );
        continue;
      }

      if (ex.scope === ExpenseScope.SHARED) {
        if (!couple || ex.coupleId !== couple.coupleId) continue;
        const st = this.effectiveOccurrenceStatus(occ.status, occ.dueDate);
        if (st === ExpenseStatus.CANCELLED) continue;
        const share = await this.calculateSharedExpenseResponsibility(
          ex.id,
          occ.amount,
          userId,
        );
        totalSharedResp = totalSharedResp.add(share);
        byCat.set(
          ex.category,
          (byCat.get(ex.category) ?? new Prisma.Decimal(0)).add(share),
        );
      }
    }

    const totalExpensesMonth = totalIndividual.add(totalSharedResp);
    const balanceMonth = incomeBlock.totalIncomeMonth.sub(totalExpensesMonth);
    const status = this.getFinancialStatus(
      incomeBlock.totalIncomeMonth,
      totalExpensesMonth,
    );

    const upcomingBills = await this.prisma.expenseOccurrence.findMany({
      where: {
        deletedAt: null,
        referenceMonth: month,
        status: { in: [ExpenseStatus.PENDING, ExpenseStatus.OVERDUE] },
        dueDate: { gte: new Date() },
        expense: {
          deletedAt: null,
          OR: [
            { scope: ExpenseScope.INDIVIDUAL, ownerUserId: userId },
            ...(couple
              ? [{ scope: ExpenseScope.SHARED, coupleId: couple.coupleId }]
              : []),
          ],
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: {
        expense: { include: { sharedSplits: true } },
        userPayments: { where: { userId } },
      },
    });

    const paidOccurrences = await this.prisma.expenseOccurrence.findMany({
      where: {
        deletedAt: null,
        referenceMonth: month,
        status: ExpenseStatus.PAID,
        expense: {
          deletedAt: null,
          OR: [
            { scope: ExpenseScope.INDIVIDUAL, ownerUserId: userId },
            ...(couple
              ? [{ scope: ExpenseScope.SHARED, coupleId: couple.coupleId }]
              : []),
          ],
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: {
        expense: {
          include: { sharedSplits: true },
        },
        userPayments: { where: { userId, status: ExpenseStatus.PAID } },
      },
    });

    const paidBills = await Promise.all(
      paidOccurrences.map(async (o) => {
        const amount =
          o.expense.scope === ExpenseScope.SHARED
            ? await this.calculateSharedExpenseResponsibility(
                o.expenseId,
                o.amount,
                userId,
              )
            : o.amount;
        const paymentDate =
          o.expense.scope === ExpenseScope.SHARED
            ? (o.userPayments[0]?.paymentDate ?? o.paymentDate)
            : o.paymentDate;
        return {
          id: o.id,
          title: o.expense.title,
          dueDate: o.dueDate,
          paymentDate,
          amount: amount.toFixed(2),
          status: ExpenseStatus.PAID,
        };
      }),
    );

    const expensesByCategory = [...byCat.entries()].map(
      ([category, amount]) => ({
        category,
        amount: amount.toFixed(2),
      }),
    );

    return {
      month: monthYm,
      totalIncomeMonth: incomeBlock.totalIncomeMonth.toFixed(2),
      baseSalaryMonth: incomeBlock.baseSalaryMonth.toFixed(2),
      extraIncomeMonth: incomeBlock.extraIncomeMonth.toFixed(2),
      totalIndividualExpensesMonth: totalIndividual.toFixed(2),
      totalSharedExpensesResponsibilityMonth: totalSharedResp.toFixed(2),
      totalExpensesMonth: totalExpensesMonth.toFixed(2),
      balanceMonth: balanceMonth.toFixed(2),
      status,
      upcomingBills: (
        await Promise.all(
          upcomingBills.map(async (o) => {
            if (
              o.expense.scope === ExpenseScope.SHARED &&
              o.userPayments.some((p) => p.status === ExpenseStatus.PAID)
            ) {
              return null;
            }
          const amount =
            o.expense.scope === ExpenseScope.SHARED
              ? await this.calculateSharedExpenseResponsibility(
                  o.expenseId,
                  o.amount,
                  userId,
                )
              : o.amount;
          return {
            id: o.id,
            title: o.expense.title,
            dueDate: o.dueDate,
            amount: amount.toFixed(2),
            status: this.effectiveOccurrenceStatus(o.status, o.dueDate),
          };
          }),
        )
      ).filter((bill): bill is NonNullable<typeof bill> => bill !== null),
      paidBills,
      expensesByCategory,
      futureProjection: [] as unknown[],
    };
  }

  async getIndividualStatement(
    userId: string,
    params: {
      monthYm: string;
      name?: string;
      source?: IndividualStatementSource;
    },
  ) {
    const month = this.monthStart(params.monthYm);
    const source = params.source ?? 'ALL';
    const search = params.name?.trim();
    const couple = await this.permission.getActiveCoupleForUser(userId);

    await this.ensureRecurringOccurrencesForIndividualMonth(
      userId,
      couple?.coupleId ?? null,
      month,
    );

    const scopeFilters: Prisma.ExpenseWhereInput[] = [];
    if (source === 'ALL' || source === 'INDIVIDUAL') {
      scopeFilters.push({
        scope: ExpenseScope.INDIVIDUAL,
        ownerUserId: userId,
      });
    }
    if ((source === 'ALL' || source === 'SHARED') && couple) {
      scopeFilters.push({
        scope: ExpenseScope.SHARED,
        coupleId: couple.coupleId,
      });
    }

    if (scopeFilters.length === 0) {
      return {
        month: params.monthYm,
        source,
        totalAmount: '0.00',
        individualTotal: '0.00',
        sharedResponsibilityTotal: '0.00',
        paidTotal: '0.00',
        pendingTotal: '0.00',
        overdueTotal: '0.00',
        items: [],
      };
    }

    const occurrences = await this.prisma.expenseOccurrence.findMany({
      where: {
        deletedAt: null,
        referenceMonth: month,
        expense: {
          deletedAt: null,
          AND: [
            { OR: scopeFilters },
            ...(search
              ? [
                  {
                    OR: [
                      { title: { contains: search, mode: 'insensitive' } },
                      { category: { contains: search, mode: 'insensitive' } },
                      { cardName: { contains: search, mode: 'insensitive' } },
                    ],
                  } satisfies Prisma.ExpenseWhereInput,
                ]
              : []),
          ],
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        expense: {
          include: {
            owner: { select: { id: true, name: true, username: true } },
            sharedSplits: true,
          },
        },
        userPayments: { where: { userId } },
      },
    });

    let individualTotal = new Prisma.Decimal(0);
    let sharedResponsibilityTotal = new Prisma.Decimal(0);
    let paidTotal = new Prisma.Decimal(0);
    let pendingTotal = new Prisma.Decimal(0);
    let overdueTotal = new Prisma.Decimal(0);

    const items = [];
    for (const occurrence of occurrences) {
      const expense = occurrence.expense;
      const occurrenceStatus = this.effectiveOccurrenceStatus(
        occurrence.status,
        occurrence.dueDate,
      );
      if (occurrenceStatus === ExpenseStatus.CANCELLED) continue;

      const isShared = expense.scope === ExpenseScope.SHARED;
      const personalPayment = isShared
        ? occurrence.userPayments.find((payment) => payment.userId === userId)
        : null;
      const status =
        personalPayment?.status === ExpenseStatus.PAID
          ? ExpenseStatus.PAID
          : occurrenceStatus;
      const amount = isShared
        ? await this.calculateSharedExpenseResponsibility(
            expense.id,
            occurrence.amount,
            userId,
          )
        : occurrence.amount;

      if (isShared) {
        sharedResponsibilityTotal = sharedResponsibilityTotal.add(amount);
      } else {
        individualTotal = individualTotal.add(amount);
      }

      if (status === ExpenseStatus.PAID) paidTotal = paidTotal.add(amount);
      else if (status === ExpenseStatus.OVERDUE)
        overdueTotal = overdueTotal.add(amount);
      else pendingTotal = pendingTotal.add(amount);

      items.push({
        id: occurrence.id,
        occurrenceId: occurrence.id,
        expenseId: expense.id,
        title: expense.title,
        description: expense.description,
        category: expense.category,
        source: isShared ? 'SHARED' : 'INDIVIDUAL',
        sourceLabel: isShared ? 'Casal - minha parte' : 'Individual',
        amount: amount.toFixed(2),
        originalAmount: occurrence.amount.toFixed(2),
        dueDate: occurrence.dueDate,
        paymentDate: personalPayment?.paymentDate ?? occurrence.paymentDate,
        referenceMonth: occurrence.referenceMonth,
        status,
        expenseType: expense.expenseType,
        paymentMethod: expense.paymentMethod,
        cardName: expense.cardName,
        installmentNumber: occurrence.installmentNumber,
        totalInstallments: occurrence.totalInstallments,
        createdBy: expense.owner
          ? {
              id: expense.owner.id,
              name: expense.owner.name,
              username: expense.owner.username,
            }
          : null,
      });
    }

    const totalAmount = individualTotal.add(sharedResponsibilityTotal);

    return {
      month: params.monthYm,
      source,
      totalAmount: totalAmount.toFixed(2),
      individualTotal: individualTotal.toFixed(2),
      sharedResponsibilityTotal: sharedResponsibilityTotal.toFixed(2),
      paidTotal: paidTotal.toFixed(2),
      pendingTotal: pendingTotal.toFixed(2),
      overdueTotal: overdueTotal.toFixed(2),
      items,
    };
  }

  async calculateCoupleMonth(coupleId: string, monthYm: string) {
    const month = this.monthStart(monthYm);
    await this.ensureRecurringOccurrencesForCoupleMonth(coupleId, month);

    const occs = await this.prisma.expenseOccurrence.findMany({
      where: {
        coupleId,
        deletedAt: null,
        referenceMonth: month,
      },
      include: { expense: true },
    });

    let totalShared = new Prisma.Decimal(0);
    let paid = new Prisma.Decimal(0);
    let pending = new Prisma.Decimal(0);
    let overdue = new Prisma.Decimal(0);
    let cancelled = new Prisma.Decimal(0);
    const byCategory = new Map<string, Prisma.Decimal>();

    for (const o of occs) {
      const ex = o.expense;
      if (ex.deletedAt || ex.scope !== ExpenseScope.SHARED) continue;
      const st = this.effectiveOccurrenceStatus(o.status, o.dueDate);
      if (st === ExpenseStatus.PAID) paid = paid.add(o.amount);
      else if (st === ExpenseStatus.PENDING) pending = pending.add(o.amount);
      else if (st === ExpenseStatus.OVERDUE) overdue = overdue.add(o.amount);
      else if (st === ExpenseStatus.CANCELLED) {
        cancelled = cancelled.add(o.amount);
        continue;
      }
      totalShared = totalShared.add(o.amount);
      byCategory.set(
        ex.category,
        (byCategory.get(ex.category) ?? new Prisma.Decimal(0)).add(o.amount),
      );
    }

    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
      include: { userA: true, userB: true },
    });
    const responsibility: Record<string, string> = {};
    const partnerResponsibilities: Array<{
      id: string;
      name: string;
      username: string;
      total: string;
    }> = [];
    if (couple) {
      for (const person of [couple.userA, couple.userB]) {
        let sum = new Prisma.Decimal(0);
        for (const o of occs) {
          if (o.expense.deletedAt || o.expense.scope !== ExpenseScope.SHARED)
            continue;
          const st = this.effectiveOccurrenceStatus(o.status, o.dueDate);
          if (st === ExpenseStatus.CANCELLED) continue;
          sum = sum.add(
            await this.calculateSharedExpenseResponsibility(
              o.expenseId,
              o.amount,
              person.id,
            ),
          );
        }
        responsibility[person.id] = sum.toFixed(2);
        partnerResponsibilities.push({
          id: person.id,
          name: person.name,
          username: person.username,
          total: sum.toFixed(2),
        });
      }
    }

    return {
      month: monthYm,
      totalSharedExpenses: totalShared.toFixed(2),
      paidTotal: paid.toFixed(2),
      pendingTotal: pending.toFixed(2),
      overdueTotal: overdue.toFixed(2),
      cancelledTotal: cancelled.toFixed(2),
      categoryDistribution: [...byCategory.entries()].map(([c, a]) => ({
        category: c,
        amount: a.toFixed(2),
      })),
      partnerResponsibility: responsibility,
      partnerResponsibilities,
      monthlyEvolution: [],
    };
  }

  async calculateRecurringExpenses(
    expenseId: string,
    month: Date,
  ): Promise<Prisma.Decimal> {
    const occ = await this.prisma.expenseOccurrence.findFirst({
      where: { expenseId, referenceMonth: month },
    });
    return occ?.amount ?? new Prisma.Decimal(0);
  }

  async calculateInstallments(
    userId: string,
    month: Date,
  ): Promise<Prisma.Decimal> {
    const occs = await this.prisma.expenseOccurrence.findMany({
      where: {
        userId,
        referenceMonth: month,
        deletedAt: null,
        installmentNumber: { not: null },
      },
    });
    return occs.reduce((s, o) => s.add(o.amount), new Prisma.Decimal(0));
  }
}
