import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseScope, ExpenseStatus, ExpenseType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { PermissionService } from '../permission/permission.service';
import { ExpensesService } from '../expenses/expenses.service';
import type {
  CreateInstallmentDto,
  DeleteInstallmentDto,
  PayInstallmentDto,
  UpdateInstallmentDto,
} from './dto/installment.dto';
import type { CreateExpenseDto } from '../expenses/dto/create-expense.dto';

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permission: PermissionService,
    private readonly expenses: ExpensesService,
  ) {}

  async create(userId: string, dto: CreateInstallmentDto) {
    const body: CreateExpenseDto = {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      totalAmount: dto.totalAmount,
      expenseType: ExpenseType.INSTALLMENT,
      paymentMethod: dto.paymentMethod,
      cardName: dto.cardName,
      paidByUserId: dto.paidByUserId,
      installment: {
        totalInstallments: dto.totalInstallments,
        firstReferenceMonth: dto.firstReferenceMonth,
        dueDay: dto.dueDay,
      },
    };
    if (dto.scope === ExpenseScope.SHARED) {
      return this.expenses.createShared(userId, body);
    }
    return this.expenses.createIndividual(userId, body);
  }

  async list(userId: string) {
    const couple = await this.permission.getActiveCoupleForUser(userId);
    const groups = await this.prisma.installmentGroup.findMany({
      where: {
        OR: [
          { userId },
          ...(couple ? [{ coupleId: couple.coupleId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        expenses: {
          include: {
            occurrences: { where: { deletedAt: null } },
            paidBy: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    return ok(groups, 'Operation completed successfully');
  }

  async one(userId: string, id: string) {
    const couple = await this.permission.getActiveCoupleForUser(userId);
    const g = await this.prisma.installmentGroup.findFirst({
      where: {
        id,
        OR: [
          { userId },
          ...(couple ? [{ coupleId: couple.coupleId }] : []),
        ],
      },
      include: {
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    if (!g) throw new NotFoundException();
    return ok(g, 'Operation completed successfully');
  }

  private async findEditableGroup(userId: string, id: string) {
    const couple = await this.permission.getActiveCoupleForUser(userId);
    const group = await this.prisma.installmentGroup.findFirst({
      where: {
        id,
        OR: [
          { userId },
          ...(couple ? [{ coupleId: couple.coupleId }] : []),
        ],
      },
      include: {
        expenses: {
          include: {
            occurrences: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException();
    for (const expense of group.expenses) {
      await this.permission.assertExpenseEditable(userId, expense);
    }
    return group;
  }

  async update(userId: string, id: string, dto: UpdateInstallmentDto) {
    const group = await this.findEditableGroup(userId, id);
    const currentExpense = group.expenses[0];
    if (!currentExpense) throw new NotFoundException();
    const amount =
      dto.totalAmount !== undefined
        ? new Prisma.Decimal(dto.totalAmount)
        : group.totalAmount;
    const totalInstallments =
      dto.totalInstallments ?? group.totalInstallments;
    const installmentAmount = amount.div(totalInstallments);

    await this.prisma.installmentGroup.update({
      where: { id },
      data: {
        title: dto.title,
        totalAmount: amount,
        totalInstallments,
      },
      include: {
        expenses: {
          include: {
            occurrences: { where: { deletedAt: null } },
            paidBy: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    await this.prisma.expense.updateMany({
      where: { installmentGroupId: group.id, deletedAt: null },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        totalAmount: amount,
        paymentMethod: dto.paymentMethod,
        cardName: dto.cardName,
        paidByUserId: dto.paidByUserId,
      },
    });

    await this.rebuildInstallmentOccurrences({
      expenseId: currentExpense.id,
      userId: currentExpense.ownerUserId!,
      coupleId: currentExpense.coupleId,
      firstReferenceMonth: group.firstReferenceMonth,
      totalInstallments,
      installmentAmount,
    });

    const updated = await this.prisma.installmentGroup.findUnique({
      where: { id },
      include: {
        expenses: {
          include: {
            occurrences: { where: { deletedAt: null } },
            paidBy: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    return ok(updated, 'Operation completed successfully');
  }

  private monthAt(y: number, monthIndex0: number): Date {
    return new Date(Date.UTC(y, monthIndex0, 1));
  }

  private dueDateFor(ref: Date, day = 10): Date {
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(day, lastDay)));
  }

  private async rebuildInstallmentOccurrences(params: {
    expenseId: string;
    userId: string;
    coupleId: string | null;
    firstReferenceMonth: Date;
    totalInstallments: number;
    installmentAmount: Prisma.Decimal;
  }) {
    const y0 = params.firstReferenceMonth.getUTCFullYear();
    const m0 = params.firstReferenceMonth.getUTCMonth();

    for (let i = 0; i < params.totalInstallments; i++) {
      const ref = this.monthAt(y0, m0 + i);
      const existing = await this.prisma.expenseOccurrence.findUnique({
        where: {
          expenseId_referenceMonth: {
            expenseId: params.expenseId,
            referenceMonth: ref,
          },
        },
      });
      const data = {
        installmentNumber: i + 1,
        totalInstallments: params.totalInstallments,
        amount: params.installmentAmount,
        dueDate: this.dueDateFor(ref),
        deletedAt: null,
      };
      if (existing) {
        await this.prisma.expenseOccurrence.update({
          where: { id: existing.id },
          data:
            existing.status === ExpenseStatus.PAID
              ? {
                  installmentNumber: data.installmentNumber,
                  totalInstallments: data.totalInstallments,
                  deletedAt: null,
                }
              : data,
        });
      } else {
        await this.prisma.expenseOccurrence.create({
          data: {
            expenseId: params.expenseId,
            userId: params.userId,
            coupleId: params.coupleId,
            referenceMonth: ref,
            dueDate: data.dueDate,
            amount: params.installmentAmount,
            status: ExpenseStatus.PENDING,
            installmentNumber: i + 1,
            totalInstallments: params.totalInstallments,
          },
        });
      }
    }

    const lastRef = this.monthAt(y0, m0 + params.totalInstallments - 1);
    await this.prisma.expenseOccurrence.updateMany({
      where: {
        expenseId: params.expenseId,
        referenceMonth: { gt: lastRef },
        deletedAt: null,
        status: { not: ExpenseStatus.PAID },
      },
      data: { deletedAt: new Date() },
    });
  }

  async pay(userId: string, id: string, dto?: PayInstallmentDto) {
    const group = await this.findEditableGroup(userId, id);
    const now = new Date();

    const payableOccurrences = group.expenses.flatMap((expense) =>
      expense.occurrences.filter(
        (occurrence) =>
          occurrence.deletedAt === null &&
          occurrence.status !== ExpenseStatus.CANCELLED,
      ),
    );

    let occurrenceIdsToPay: string[];
    if (dto?.occurrenceIds?.length) {
      const allowed = new Set(payableOccurrences.map((o) => o.id));
      occurrenceIdsToPay = dto.occurrenceIds.filter((occId) => allowed.has(occId));
      if (occurrenceIdsToPay.length === 0) {
        throw new NotFoundException(
          'Nenhuma parcela válida foi selecionada para quitação.',
        );
      }
    } else {
      occurrenceIdsToPay = payableOccurrences.map((o) => o.id);
    }

    await this.prisma.expenseOccurrence.updateMany({
      where: { id: { in: occurrenceIdsToPay } },
      data: { status: ExpenseStatus.PAID, paymentDate: now },
    });

    for (const expense of group.expenses) {
      await this.syncExpenseStatus(expense.id);
    }

    const updated = await this.prisma.installmentGroup.findUnique({
      where: { id },
      include: {
        expenses: {
          include: {
            occurrences: { where: { deletedAt: null } },
            paidBy: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    return ok(updated, 'Operation completed successfully');
  }

  private async syncExpenseStatus(expenseId: string) {
    const occurrences = await this.prisma.expenseOccurrence.findMany({
      where: { expenseId, deletedAt: null },
      select: { status: true },
    });
    if (occurrences.length === 0) return;

    const nextStatus = occurrences.every(
      (o) => o.status === ExpenseStatus.CANCELLED,
    )
      ? ExpenseStatus.CANCELLED
      : occurrences.every((o) => o.status === ExpenseStatus.PAID)
        ? ExpenseStatus.PAID
        : ExpenseStatus.PENDING;

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: { status: nextStatus },
    });
  }

  async remove(userId: string, id: string, dto: DeleteInstallmentDto) {
    await this.expenses.assertPassword(userId, dto.password);
    const group = await this.findEditableGroup(userId, id);
    await this.prisma.$transaction([
      this.prisma.expenseOccurrence.updateMany({
        where: { expense: { installmentGroupId: group.id } },
        data: { deletedAt: new Date() },
      }),
      this.prisma.expense.updateMany({
        where: { installmentGroupId: group.id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.installmentGroup.delete({ where: { id } }),
    ]);
    return ok({ id }, 'Operation completed successfully');
  }
}
