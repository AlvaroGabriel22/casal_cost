import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvestmentScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { ok } from '../common/api-response';
import { AuditLogService } from '../audit/audit-log.service';
import type {
  CreateInvestmentDto,
  UpdateInvestmentDto,
} from './dto/investment.dto';
import type {
  InvestmentOverview,
  InvestmentScopeSummary,
} from './investment.types';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permission: PermissionService,
    private readonly audit: AuditLogService,
  ) {}

  private refMonth(value: string): Date {
    return new Date(value.length === 7 ? `${value}-01` : value);
  }

  private ym(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private addMonths(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return this.ym(d);
  }

  private currentYm(): string {
    const d = new Date();
    return this.ym(d);
  }

  private scopeFilter(
    userId: string,
    scope: InvestmentScope,
    coupleId: string | null,
  ): Prisma.InvestmentContributionWhereInput {
    if (scope === InvestmentScope.INDIVIDUAL) {
      return {
        deletedAt: null,
        scope: InvestmentScope.INDIVIDUAL,
        userId,
      };
    }
    if (!coupleId) {
      return { deletedAt: null, id: '__none__' };
    }
    return {
      deletedAt: null,
      scope: InvestmentScope.COUPLE,
      coupleId,
    };
  }

  /** Aggregates investment data for one scope. Couple totals sum every partner's contributions. */
  async summarizeScope(
    userId: string,
    scope: InvestmentScope,
    referenceMonth?: string,
  ): Promise<InvestmentScopeSummary> {
    const reference = referenceMonth?.match(/^\d{4}-\d{2}$/)
      ? referenceMonth
      : this.currentYm();
    const couple = await this.permission.getActiveCoupleForUser(userId);
    const where = this.scopeFilter(userId, scope, couple?.coupleId ?? null);

    const rows = await this.prisma.investmentContribution.findMany({
      where,
      orderBy: [{ referenceMonth: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const byMonth = new Map<string, number>();
    const partnerAllTime = new Map<string, { name: string; total: number }>();
    const partnerMonth = new Map<string, { name: string; total: number }>();
    let allTimeTotal = 0;

    for (const row of rows) {
      const amount = Number(row.amount);
      const month = this.ym(row.referenceMonth);
      byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
      allTimeTotal += amount;

      if (scope === InvestmentScope.COUPLE && row.user) {
        const all = partnerAllTime.get(row.userId) ?? {
          name: row.user.name,
          total: 0,
        };
        all.total += amount;
        partnerAllTime.set(row.userId, all);

        if (month === reference) {
          const pm = partnerMonth.get(row.userId) ?? {
            name: row.user.name,
            total: 0,
          };
          pm.total += amount;
          partnerMonth.set(row.userId, pm);
        }
      }
    }

    const monthTotal = byMonth.get(reference) ?? 0;
    const previousMonthTotal = byMonth.get(this.addMonths(reference, -1)) ?? 0;

    const monthlyHistory = [...byMonth.entries()]
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const monthsWithData = monthlyHistory.filter((h) => h.amount > 0);
    const averageMonthly =
      monthsWithData.length > 0
        ? monthsWithData.reduce((sum, h) => sum + h.amount, 0) /
          monthsWithData.length
        : 0;

    let consecutiveMonths = 0;
    let cursor = reference;
    for (let i = 0; i < 24; i++) {
      if ((byMonth.get(cursor) ?? 0) > 0) {
        consecutiveMonths += 1;
        cursor = this.addMonths(cursor, -1);
      } else {
        break;
      }
    }

    const contributionsInMonth = rows.filter(
      (row) => this.ym(row.referenceMonth) === reference,
    ).length;

    const byPartner =
      scope === InvestmentScope.COUPLE
        ? [...partnerAllTime.entries()].map(([uid, data]) => ({
            userId: uid,
            name: data.name,
            monthAmount: partnerMonth.get(uid)?.total ?? 0,
            allTimeAmount: data.total,
          }))
        : undefined;

    return {
      scope,
      referenceMonth: reference,
      monthTotal,
      previousMonthTotal,
      allTimeTotal,
      averageMonthly,
      consecutiveMonths,
      contributionsInMonth,
      contributionsAllTime: rows.length,
      byPartner,
      monthlyHistory,
    };
  }

  async summarizeOverview(
    userId: string,
    referenceMonth?: string,
  ): Promise<InvestmentOverview> {
    const reference = referenceMonth?.match(/^\d{4}-\d{2}$/)
      ? referenceMonth
      : this.currentYm();
    const couple = await this.permission.getActiveCoupleForUser(userId);
    const individual = await this.summarizeScope(
      userId,
      InvestmentScope.INDIVIDUAL,
      reference,
    );
    const coupleSummary = couple
      ? await this.summarizeScope(userId, InvestmentScope.COUPLE, reference)
      : null;

    return {
      referenceMonth: reference,
      targetPercent: 20,
      individual,
      couple: coupleSummary,
    };
  }

  async create(userId: string, dto: CreateInvestmentDto) {
    let coupleId: string | null = null;
    if (dto.scope === InvestmentScope.COUPLE) {
      const couple = await this.permission.getActiveCoupleForUser(userId);
      if (!couple) {
        throw new BadRequestException(
          'Você precisa ter um casal ativo para registrar investimento conjunto.',
        );
      }
      coupleId = couple.coupleId;
    }

    const row = await this.prisma.investmentContribution.create({
      data: {
        userId,
        coupleId,
        scope: dto.scope,
        amount: new Prisma.Decimal(dto.amount),
        referenceMonth: this.refMonth(dto.referenceMonth),
        contributedAt: dto.contributedAt ? new Date(dto.contributedAt) : null,
        description: dto.description?.trim() || null,
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    });

    await this.audit.log({
      userId,
      entity: 'InvestmentContribution',
      entityId: row.id,
      action: 'CREATE',
      newValue: row,
    });

    return ok(row, 'Aporte registrado com sucesso.');
  }

  async list(userId: string, scope?: InvestmentScope, month?: string) {
    const couple = await this.permission.getActiveCoupleForUser(userId);

    if (scope === InvestmentScope.COUPLE && !couple) {
      return ok(
        {
          items: [],
          contributionsInMonth: 0,
          monthTotal: '0.00',
          allTimeTotal: '0.00',
          history: [],
        },
        'Operation completed successfully',
      );
    }

    const resolvedScope = scope ?? InvestmentScope.INDIVIDUAL;
    const summary = await this.summarizeScope(
      userId,
      resolvedScope,
      month && /^\d{4}-\d{2}$/.test(month) ? month : undefined,
    );

    const where = this.scopeFilter(
      userId,
      resolvedScope,
      couple?.coupleId ?? null,
    );
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      where.referenceMonth = this.refMonth(month);
    }

    const items = await this.prisma.investmentContribution.findMany({
      where,
      orderBy: [{ referenceMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    });

    return ok(
      {
        items,
        contributionsInMonth: summary.contributionsInMonth,
        monthTotal: summary.monthTotal.toFixed(2),
        allTimeTotal: summary.allTimeTotal.toFixed(2),
        history: summary.monthlyHistory.map((row) => ({
          month: row.month,
          amount: row.amount.toFixed(2),
        })),
        summary,
      },
      'Operation completed successfully',
    );
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    const row = await this.findOwnedOrCoupleRow(userId, id);
    const updated = await this.prisma.investmentContribution.update({
      where: { id },
      data: {
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        referenceMonth: dto.referenceMonth
          ? this.refMonth(dto.referenceMonth)
          : undefined,
        contributedAt: dto.contributedAt ? new Date(dto.contributedAt) : undefined,
        description:
          dto.description !== undefined
            ? dto.description.trim() || null
            : undefined,
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    });
    await this.audit.log({
      userId,
      entity: 'InvestmentContribution',
      entityId: id,
      action: 'UPDATE',
      newValue: dto,
    });
    return ok(updated, 'Aporte atualizado com sucesso.');
  }

  async remove(userId: string, id: string) {
    const row = await this.findOwnedOrCoupleRow(userId, id);
    const updated = await this.prisma.investmentContribution.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      userId,
      entity: 'InvestmentContribution',
      entityId: id,
      action: 'SOFT_DELETE',
      oldValue: row,
    });
    return ok(updated, 'Aporte excluído com sucesso.');
  }

  private async findOwnedOrCoupleRow(userId: string, id: string) {
    const row = await this.prisma.investmentContribution.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Aporte não encontrado.');

    if (row.scope === InvestmentScope.INDIVIDUAL) {
      if (row.userId !== userId) {
        throw new NotFoundException('Aporte não encontrado.');
      }
      return row;
    }

    if (row.coupleId) {
      await this.permission.assertCoupleMembership(userId, row.coupleId);
      return row;
    }

    throw new NotFoundException('Aporte não encontrado.');
  }
}
