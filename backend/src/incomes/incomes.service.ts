import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { paginate } from '../common/dto/pagination.dto';
import { AuditLogService } from '../audit/audit-log.service';
import type { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';

@Injectable()
export class IncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private refMonth(dto: string): Date {
    return new Date(dto.length === 7 ? `${dto}-01` : dto);
  }

  async create(userId: string, dto: CreateIncomeDto) {
    const row = await this.prisma.income.create({
      data: {
        userId,
        type: dto.type,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        referenceMonth: this.refMonth(dto.referenceMonth),
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : null,
        isRecurring: dto.isRecurring ?? false,
        recurrenceStartDate: dto.recurrenceStartDate
          ? new Date(dto.recurrenceStartDate)
          : null,
        recurrenceEndDate: dto.recurrenceEndDate
          ? new Date(dto.recurrenceEndDate)
          : null,
      },
    });
    await this.audit.log({
      userId,
      entity: 'Income',
      entityId: row.id,
      action: 'CREATE',
      newValue: row,
    });
    return ok(row, 'Operation completed successfully');
  }

  async list(userId: string, page?: number, limit?: number) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const where = { userId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.income.findMany({
        where,
        skip,
        take,
        orderBy: { referenceMonth: 'desc' },
      }),
      this.prisma.income.count({ where }),
    ]);
    return ok(
      {
        items,
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
      'Operation completed successfully',
    );
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    const row = await this.prisma.income.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!row) throw new NotFoundException();
    const updated = await this.prisma.income.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description,
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        referenceMonth: dto.referenceMonth
          ? this.refMonth(dto.referenceMonth)
          : undefined,
      },
    });
    await this.audit.log({
      userId,
      entity: 'Income',
      entityId: id,
      action: 'UPDATE',
      newValue: dto,
    });
    return ok(updated, 'Operation completed successfully');
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.income.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!row) throw new NotFoundException();
    const updated = await this.prisma.income.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      userId,
      entity: 'Income',
      entityId: id,
      action: 'SOFT_DELETE',
      oldValue: row,
    });
    return ok(updated, 'Operation completed successfully');
  }
}
