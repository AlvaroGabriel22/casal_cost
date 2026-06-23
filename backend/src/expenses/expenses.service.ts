import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ExpenseScope,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  Prisma,
  RecurrenceFrequency,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { paginate } from '../common/dto/pagination.dto';
import { PermissionService } from '../permission/permission.service';
import { OccurrenceGenerationService } from '../financial/occurrence-generation.service';
import { AuditLogService } from '../audit/audit-log.service';
import type {
  CreateExpenseDto,
  ConfirmPasswordDto,
  ExpensePaymentDto,
  PayMyShareDto,
  UpdateExpenseDto,
} from './dto/create-expense.dto';
import type { ExpenseListQueryDto } from './dto/expense-query.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permission: PermissionService,
    private readonly occurrences: OccurrenceGenerationService,
    private readonly audit: AuditLogService,
  ) {}

  private monthStartFromYm(ym: string): Date {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }

  private defaultYm(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`;
  }

  private dueDateFromMonth(referenceMonth: Date, dueDay: number): Date {
    const y = referenceMonth.getUTCFullYear();
    const m = referenceMonth.getUTCMonth();
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const day = Math.min(dueDay, lastDay);
    return new Date(Date.UTC(y, m, day));
  }

  /** Returns the registered due day for the user's card, if it applies. */
  private async resolveCardDueDay(
    userId: string,
    paymentMethod: PaymentMethod,
    cardName: string | null | undefined,
  ): Promise<number | undefined> {
    if (
      !cardName ||
      (paymentMethod !== PaymentMethod.CREDIT_CARD &&
        paymentMethod !== PaymentMethod.DEBIT_CARD)
    ) {
      return undefined;
    }
    const card = await this.prisma.userCard.findUnique({
      where: { userId_name: { userId, name: cardName } },
    });
    return card?.dueDay;
  }

  /**
   * Resolves the due date for a card-based occurrence: when the card has a
   * registered due day it wins (kept on the reference month); otherwise the
   * provided fallback date is used.
   */
  private async resolveCardDueDate(
    userId: string,
    paymentMethod: PaymentMethod,
    cardName: string | null | undefined,
    referenceMonth: Date,
    fallback: Date,
  ): Promise<Date> {
    const dueDay = await this.resolveCardDueDay(userId, paymentMethod, cardName);
    if (dueDay === undefined) return fallback;
    return this.dueDateFromMonth(referenceMonth, dueDay);
  }

  private assertCoupleMember(
    couple: { partnerId: string },
    currentUserId: string,
    userId?: string,
  ) {
    if (!userId) return;
    if (userId !== currentUserId && userId !== couple.partnerId) {
      throw new BadRequestException('Selecione um membro do casal ativo para registrar quem realizou o pagamento.');
    }
  }

  async createIndividual(userId: string, dto: CreateExpenseDto) {
    const amount = new Prisma.Decimal(dto.totalAmount);
    const couple = await this.permission.getActiveCoupleForUser(userId);

    if (dto.expenseType === ExpenseType.ONE_TIME) {
      const ym = dto.referenceMonth ?? this.defaultYm();
      const ref = this.monthStartFromYm(ym);
      const due = await this.resolveCardDueDate(
        userId,
        dto.paymentMethod,
        dto.cardName,
        ref,
        dto.dueDate ? new Date(dto.dueDate) : ref,
      );
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          scope: ExpenseScope.INDIVIDUAL,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: dto.expenseType,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
        },
      });
      await this.occurrences.createOneTimeOccurrence({
        expenseId: exp.id,
        userId,
        coupleId: null,
        referenceMonth: ref,
        amount,
        dueDate: due,
      });
      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'INDIVIDUAL', type: dto.expenseType },
      });
      return ok(exp, 'Operation completed successfully');
    }

    if (
      dto.expenseType === ExpenseType.FIXED ||
      dto.expenseType === ExpenseType.RECURRING
    ) {
      if (!dto.recurrence) {
        throw new BadRequestException('Informe os dados de recorrência para esta despesa.');
      }
      if (dto.recurrence.frequency !== RecurrenceFrequency.MONTHLY) {
        throw new BadRequestException('No momento, apenas recorrência mensal é suportada.');
      }
      const start = new Date(dto.recurrence.startDate);
      const ym = dto.referenceMonth ?? this.defaultYm();
      const ref = this.monthStartFromYm(ym);
      const cardDueDay = await this.resolveCardDueDay(
        userId,
        dto.paymentMethod,
        dto.cardName,
      );
      const dayOfMonth =
        cardDueDay ?? dto.recurrence.dayOfMonth ?? start.getUTCDate();

      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          scope: ExpenseScope.INDIVIDUAL,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: dto.expenseType,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
          recurrenceRule: {
            create: {
              frequency: dto.recurrence.frequency,
              startDate: start,
              endDate: dto.recurrence.endDate
                ? new Date(dto.recurrence.endDate)
                : null,
              dayOfMonth,
            },
          },
        },
      });

      await this.occurrences.ensureMonthlyOccurrence({
        expenseId: exp.id,
        userId,
        coupleId: null,
        referenceMonth: ref,
        amount,
        dueDay: dayOfMonth,
      });

      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'INDIVIDUAL', type: dto.expenseType },
      });
      return ok(exp, 'Operation completed successfully');
    }

    if (dto.expenseType === ExpenseType.INSTALLMENT) {
      if (!dto.installment) {
        throw new BadRequestException('Informe o número de parcelas e o mês inicial.');
      }
      const n = dto.installment.totalInstallments;
      const first = this.monthStartFromYm(dto.installment.firstReferenceMonth);
      const per = amount.div(n);
      const ig = await this.prisma.installmentGroup.create({
        data: {
          userId,
          title: dto.title,
          totalAmount: amount,
          totalInstallments: n,
          firstReferenceMonth: first,
        },
      });
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          scope: ExpenseScope.INDIVIDUAL,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: ExpenseType.INSTALLMENT,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
          installmentGroupId: ig.id,
        },
      });
      const cardDueDay = await this.resolveCardDueDay(
        userId,
        dto.paymentMethod,
        dto.cardName,
      );
      await this.occurrences.generateInstallmentOccurrences({
        expenseId: exp.id,
        userId,
        coupleId: null,
        installmentAmount: per,
        totalInstallments: n,
        firstReferenceMonth: first,
        dueDay: dto.installment.dueDay ?? cardDueDay,
      });
      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'INDIVIDUAL', type: 'INSTALLMENT' },
      });
      return ok(exp, 'Operation completed successfully');
    }

    if (dto.expenseType === ExpenseType.FUTURE_CREDIT_CARD) {
      const ym = dto.referenceMonth ?? this.defaultYm();
      const ref = this.monthStartFromYm(ym);
      const due = await this.resolveCardDueDate(
        userId,
        dto.paymentMethod,
        dto.cardName,
        ref,
        dto.dueDate ? new Date(dto.dueDate) : ref,
      );
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          scope: ExpenseScope.INDIVIDUAL,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: ExpenseType.FUTURE_CREDIT_CARD,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
        },
      });
      await this.occurrences.createOneTimeOccurrence({
        expenseId: exp.id,
        userId,
        coupleId: null,
        referenceMonth: ref,
        amount,
        dueDate: due,
      });
      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'INDIVIDUAL', type: 'FUTURE_CREDIT_CARD' },
      });
      return ok(exp, 'Operation completed successfully');
    }

    throw new BadRequestException('Tipo de despesa não suportado.');
  }

  async createShared(userId: string, dto: CreateExpenseDto) {
    const couple = await this.permission.getActiveCoupleForUser(userId);
    if (!couple) {
      throw new BadRequestException('Ative um casal antes de criar despesas compartilhadas.');
    }
    const amount = new Prisma.Decimal(dto.totalAmount);
    this.assertCoupleMember(couple, userId, dto.paidByUserId);

    if (dto.expenseType === ExpenseType.ONE_TIME) {
      const ym = dto.referenceMonth ?? this.defaultYm();
      const ref = this.monthStartFromYm(ym);
      const due = await this.resolveCardDueDate(
        userId,
        dto.paymentMethod,
        dto.cardName,
        ref,
        dto.dueDate ? new Date(dto.dueDate) : ref,
      );
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          coupleId: couple.coupleId,
          scope: ExpenseScope.SHARED,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: dto.expenseType,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
        },
      });
      await this.occurrences.createOneTimeOccurrence({
        expenseId: exp.id,
        userId,
        coupleId: couple.coupleId,
        referenceMonth: ref,
        amount,
        dueDate: due,
      });
      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'SHARED', type: dto.expenseType },
      });
      return ok(exp, 'Operation completed successfully');
    }

    if (
      dto.expenseType === ExpenseType.FIXED ||
      dto.expenseType === ExpenseType.RECURRING
    ) {
      if (!dto.recurrence) {
        throw new BadRequestException('Informe os dados de recorrência para esta despesa.');
      }
      const start = new Date(dto.recurrence.startDate);
      const ym = dto.referenceMonth ?? this.defaultYm();
      const ref = this.monthStartFromYm(ym);
      const cardDueDay = await this.resolveCardDueDay(
        userId,
        dto.paymentMethod,
        dto.cardName,
      );
      const dayOfMonth =
        cardDueDay ?? dto.recurrence.dayOfMonth ?? start.getUTCDate();
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          coupleId: couple.coupleId,
          scope: ExpenseScope.SHARED,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: dto.expenseType,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
          recurrenceRule: {
            create: {
              frequency: dto.recurrence.frequency,
              startDate: start,
              endDate: dto.recurrence.endDate
                ? new Date(dto.recurrence.endDate)
                : null,
              dayOfMonth,
            },
          },
        },
      });

      await this.occurrences.ensureMonthlyOccurrence({
        expenseId: exp.id,
        userId,
        coupleId: couple.coupleId,
        referenceMonth: ref,
        amount,
        dueDay: dayOfMonth,
      });

      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'SHARED', type: dto.expenseType },
      });
      return ok(exp, 'Operation completed successfully');
    }

    if (dto.expenseType === ExpenseType.INSTALLMENT) {
      if (!dto.installment) {
        throw new BadRequestException('Informe o número de parcelas e o mês inicial.');
      }
      const n = dto.installment.totalInstallments;
      const first = this.monthStartFromYm(dto.installment.firstReferenceMonth);
      const per = amount.div(n);
      const ig = await this.prisma.installmentGroup.create({
        data: {
          coupleId: couple.coupleId,
          title: dto.title,
          totalAmount: amount,
          totalInstallments: n,
          firstReferenceMonth: first,
        },
      });
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          coupleId: couple.coupleId,
          scope: ExpenseScope.SHARED,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: ExpenseType.INSTALLMENT,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
          installmentGroupId: ig.id,
        },
      });
      const cardDueDay = await this.resolveCardDueDay(
        userId,
        dto.paymentMethod,
        dto.cardName,
      );
      await this.occurrences.generateInstallmentOccurrences({
        expenseId: exp.id,
        userId,
        coupleId: couple.coupleId,
        installmentAmount: per,
        totalInstallments: n,
        firstReferenceMonth: first,
        dueDay: dto.installment.dueDay ?? cardDueDay,
      });
      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'SHARED', type: 'INSTALLMENT' },
      });
      return ok(exp, 'Operation completed successfully');
    }

    if (dto.expenseType === ExpenseType.FUTURE_CREDIT_CARD) {
      const ym = dto.referenceMonth ?? this.defaultYm();
      const ref = this.monthStartFromYm(ym);
      const due = await this.resolveCardDueDate(
        userId,
        dto.paymentMethod,
        dto.cardName,
        ref,
        dto.dueDate ? new Date(dto.dueDate) : ref,
      );
      const exp = await this.prisma.expense.create({
        data: {
          ownerUserId: userId,
          coupleId: couple.coupleId,
          scope: ExpenseScope.SHARED,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          totalAmount: amount,
          expenseType: ExpenseType.FUTURE_CREDIT_CARD,
          paymentMethod: dto.paymentMethod,
          cardName: dto.cardName,
          paidByUserId: dto.paidByUserId,
          status: ExpenseStatus.PENDING,
        },
      });
      await this.occurrences.createOneTimeOccurrence({
        expenseId: exp.id,
        userId,
        coupleId: couple.coupleId,
        referenceMonth: ref,
        amount,
        dueDate: due,
      });
      await this.audit.log({
        userId,
        entity: 'Expense',
        entityId: exp.id,
        action: 'CREATE',
        newValue: { scope: 'SHARED', type: 'FUTURE_CREDIT_CARD' },
      });
      return ok(exp, 'Operation completed successfully');
    }

    throw new BadRequestException('Tipo de despesa não suportado.');
  }

  async list(userId: string, query: ExpenseListQueryDto) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const grants = await this.prisma.individualAccountAccess.findMany({
      where: { allowedUserId: userId, canView: true },
      select: { ownerUserId: true },
    });
    const owners = [userId, ...grants.map((g) => g.ownerUserId)];

    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      scope: ExpenseScope.INDIVIDUAL,
      ownerUserId: { in: owners },
    };
    if (query.category) where.category = query.category;
    if (query.expenseType) where.expenseType = query.expenseType;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.status) where.status = query.status;

    if (query.month) {
      const m0 = this.monthStartFromYm(query.month);
      where.occurrences = { some: { referenceMonth: m0, deletedAt: null } };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          occurrences: { where: { deletedAt: null } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return ok(
      {
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      'Operation completed successfully',
    );
  }

  async listShared(userId: string, query: ExpenseListQueryDto) {
    const couple = await this.permission.getActiveCoupleForUser(userId);
    if (!couple) {
      return ok(
        { items: [], page: 1, limit: 20, total: 0, totalPages: 0 },
        'Operation completed successfully',
      );
    }
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      scope: ExpenseScope.SHARED,
      coupleId: couple.coupleId,
    };
    if (query.category) where.category = query.category;
    if (query.expenseType) where.expenseType = query.expenseType;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.status) where.status = query.status;
    if (query.month) {
      const m0 = this.monthStartFromYm(query.month);
      where.occurrences = { some: { referenceMonth: m0, deletedAt: null } };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          occurrences: { where: { deletedAt: null } },
          sharedSplits: true,
          paidBy: {
            select: { id: true, name: true, username: true },
          },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return ok(
      {
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      'Operation completed successfully',
    );
  }

  async getOne(userId: string, id: string) {
    const exp = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: {
        occurrences: true,
        recurrenceRule: true,
        sharedSplits: true,
        installmentGroup: true,
        paidBy: {
          select: { id: true, name: true, username: true },
        },
      },
    });
    if (!exp) throw new NotFoundException('Despesa não encontrada.');
    await this.permission.assertExpenseReadable(userId, exp);
    return ok(exp, 'Operation completed successfully');
  }

  async updateOne(userId: string, id: string, dto: UpdateExpenseDto) {
    const exp = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exp) throw new NotFoundException();
    await this.permission.assertExpenseEditable(userId, exp);
    if (exp.status === ExpenseStatus.PAID) {
      throw new BadRequestException('Não é possível editar uma despesa já quitada.');
    }
    if (dto.paidByUserId && exp.scope === ExpenseScope.SHARED) {
      const couple = await this.permission.getActiveCoupleForUser(userId);
      if (!couple || couple.coupleId !== exp.coupleId) {
        throw new BadRequestException('Esta despesa não está vinculada a um casal ativo.');
      }
      this.assertCoupleMember(couple, userId, dto.paidByUserId);
    }
    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        totalAmount:
          dto.totalAmount !== undefined
            ? new Prisma.Decimal(dto.totalAmount)
            : undefined,
        paymentMethod: dto.paymentMethod,
        cardName: dto.cardName,
        paidByUserId: dto.paidByUserId,
      },
    });
    await this.audit.log({
      userId,
      entity: 'Expense',
      entityId: id,
      action: 'UPDATE',
      newValue: dto,
    });
    return ok(updated, 'Operation completed successfully');
  }

  async assertPassword(userId: string, password?: string) {
    if (!password) {
      throw new UnauthorizedException('Confirme sua senha para concluir esta ação.');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Senha incorreta. Verifique e tente novamente.');
    }
  }

  async softDelete(userId: string, id: string, dto?: ConfirmPasswordDto) {
    await this.assertPassword(userId, dto?.password);
    const exp = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exp) throw new NotFoundException();
    await this.permission.assertExpenseEditable(userId, exp);
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.expenseOccurrence.updateMany({
      where: { expenseId: id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      userId,
      entity: 'Expense',
      entityId: id,
      action: 'SOFT_DELETE',
      oldValue: exp,
    });
    return ok(updated, 'Operation completed successfully');
  }

  private monthStartFromMaybeDate(value: string): Date {
    return value.length === 7
      ? this.monthStartFromYm(value)
      : this.monthStartFromYm(value.slice(0, 7));
  }

  private async syncExpenseStatus(id: string) {
    const occurrences = await this.prisma.expenseOccurrence.findMany({
      where: { expenseId: id, deletedAt: null },
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
      where: { id },
      data: { status: nextStatus },
    });
  }

  private async occurrenceWhereForAction(id: string, dto?: ExpensePaymentDto) {
    if (dto?.occurrenceId) {
      const occurrence = await this.prisma.expenseOccurrence.findFirst({
        where: { id: dto.occurrenceId, expenseId: id, deletedAt: null },
      });
      if (!occurrence) throw new NotFoundException('Lançamento mensal não encontrado.');
      return { id: occurrence.id };
    }
    if (dto?.referenceMonth) {
      const referenceMonth = this.monthStartFromMaybeDate(dto.referenceMonth);
      const occurrence = await this.prisma.expenseOccurrence.findFirst({
        where: { expenseId: id, referenceMonth, deletedAt: null },
      });
      if (!occurrence) throw new NotFoundException('Lançamento mensal não encontrado.');
      return { id: occurrence.id };
    }
    return {
      expenseId: id,
      deletedAt: null,
      status: { not: ExpenseStatus.CANCELLED },
    };
  }

  async pay(userId: string, id: string, dto?: ExpensePaymentDto) {
    const exp = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exp) throw new NotFoundException();
    await this.permission.assertExpenseEditable(userId, exp);
    const now = new Date();
    const where = await this.occurrenceWhereForAction(id, dto);

    await this.prisma.$transaction([
      this.prisma.expenseOccurrence.updateMany({
        where,
        data: { status: ExpenseStatus.PAID, paymentDate: now },
      }),
    ]);
    await this.syncExpenseStatus(id);
    const updated = await this.prisma.expense.findUnique({
      where: { id },
      include: { occurrences: { where: { deletedAt: null } } },
    });
    await this.audit.log({
      userId,
      entity: 'Expense',
      entityId: id,
      action: 'PAYMENT',
      newValue: { paymentDate: now, occurrenceId: dto?.occurrenceId },
    });
    return ok(updated, 'Operation completed successfully');
  }

  async payMyShare(userId: string, id: string, dto: PayMyShareDto) {
    await this.assertPassword(userId, dto.password);
    const exp = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exp) throw new NotFoundException();
    if (exp.scope !== ExpenseScope.SHARED) {
      throw new BadRequestException('Esta opção é válida apenas para despesas compartilhadas.');
    }
    await this.permission.assertExpenseReadable(userId, exp);

    const where = await this.occurrenceWhereForAction(id, dto);
    const occurrence = await this.prisma.expenseOccurrence.findFirst({
      where,
      include: { expense: true },
    });
    if (!occurrence) throw new NotFoundException('Lançamento mensal não encontrado.');
    if (occurrence.status === ExpenseStatus.CANCELLED) {
      throw new BadRequestException('Este lançamento foi cancelado e não pode ser quitado.');
    }

    const now = new Date();
    const payment = await this.prisma.expenseOccurrencePayment.upsert({
      where: {
        occurrenceId_userId: {
          occurrenceId: occurrence.id,
          userId,
        },
      },
      create: {
        occurrenceId: occurrence.id,
        userId,
        status: ExpenseStatus.PAID,
        paymentDate: now,
      },
      update: {
        status: ExpenseStatus.PAID,
        paymentDate: now,
      },
    });

    await this.audit.log({
      userId,
      entity: 'ExpenseOccurrencePayment',
      entityId: payment.id,
      action: 'PAY_MY_SHARE',
      newValue: { expenseId: id, occurrenceId: occurrence.id, paymentDate: now },
    });

    return ok(payment, 'Operation completed successfully');
  }

  async cancel(userId: string, id: string, dto?: ExpensePaymentDto) {
    const exp = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exp) throw new NotFoundException();
    await this.permission.assertExpenseEditable(userId, exp);
    const where = await this.occurrenceWhereForAction(id, dto);
    await this.prisma.$transaction([
      this.prisma.expenseOccurrence.updateMany({
        where,
        data: { status: ExpenseStatus.CANCELLED },
      }),
    ]);
    await this.syncExpenseStatus(id);
    const updated = await this.prisma.expense.findUnique({
      where: { id },
      include: { occurrences: { where: { deletedAt: null } } },
    });
    await this.audit.log({
      userId,
      entity: 'Expense',
      entityId: id,
      action: 'CANCEL',
      newValue: { occurrenceId: dto?.occurrenceId },
    });
    return ok(updated, 'Operation completed successfully');
  }
}
