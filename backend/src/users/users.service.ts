import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { AuditLogService } from '../audit/audit-log.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly calc: FinancialCalculationService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { financialSettings: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return ok(
      {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        financialSettings: user.financialSettings,
      },
      'Operation completed successfully',
    );
  }

  async updateMe(
    userId: string,
    body: { name?: string; email?: string },
  ) {
    if (body.email) {
      const clash = await this.prisma.user.findFirst({
        where: { email: body.email, NOT: { id: userId }, deletedAt: null },
      });
      if (clash) throw new ConflictException('Este email já está em uso por outra conta.');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        email: body.email,
      },
    });
    await this.audit.log({
      userId,
      entity: 'User',
      entityId: userId,
      action: 'UPDATE',
      newValue: body,
    });
    return ok(
      {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      'Operation completed successfully',
    );
  }

  async updateSalary(
    userId: string,
    body: { baseSalary: number; salaryPaymentDay?: number },
  ) {
    let settings = await this.prisma.financialSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      settings = await this.prisma.financialSettings.create({
        data: {
          userId,
          baseSalary: String(body.baseSalary),
          salaryPaymentDay: body.salaryPaymentDay ?? 1,
        },
      });
    } else {
      const old = { baseSalary: settings.baseSalary.toString() };
      settings = await this.prisma.financialSettings.update({
        where: { userId },
        data: {
          baseSalary: String(body.baseSalary),
          salaryPaymentDay: body.salaryPaymentDay ?? settings.salaryPaymentDay,
        },
      });
      await this.audit.log({
        userId,
        entity: 'FinancialSettings',
        entityId: settings.id,
        action: 'UPDATE',
        oldValue: old,
        newValue: { baseSalary: settings.baseSalary.toString() },
      });
    }
    return ok(settings, 'Operation completed successfully');
  }

  async listSalaryOverrides(userId: string, month?: string) {
    if (month) {
      const referenceMonth = this.calc.monthStart(month);
      const row = await this.prisma.monthlySalaryOverride.findUnique({
        where: {
          userId_referenceMonth: { userId, referenceMonth },
        },
      });
      return ok(row ? [this.mapSalaryOverride(row)] : [], 'Operation completed successfully');
    }

    const rows = await this.prisma.monthlySalaryOverride.findMany({
      where: { userId },
      orderBy: { referenceMonth: 'desc' },
      take: 24,
    });
    return ok(
      rows.map((row) => this.mapSalaryOverride(row)),
      'Operation completed successfully',
    );
  }

  async upsertSalaryOverride(
    userId: string,
    body: { month: string; amount: number; note?: string },
  ) {
    const referenceMonth = this.calc.monthStart(body.month);
    const existing = await this.prisma.monthlySalaryOverride.findUnique({
      where: {
        userId_referenceMonth: { userId, referenceMonth },
      },
    });

    const row = await this.prisma.monthlySalaryOverride.upsert({
      where: {
        userId_referenceMonth: { userId, referenceMonth },
      },
      create: {
        userId,
        referenceMonth,
        amount: String(body.amount),
        note: body.note?.trim() || null,
      },
      update: {
        amount: String(body.amount),
        note: body.note?.trim() || null,
      },
    });

    await this.audit.log({
      userId,
      entity: 'MonthlySalaryOverride',
      entityId: row.id,
      action: existing ? 'UPDATE' : 'CREATE',
      oldValue: existing
        ? { amount: existing.amount.toString(), note: existing.note }
        : undefined,
      newValue: { amount: row.amount.toString(), note: row.note, month: body.month },
    });

    return ok(this.mapSalaryOverride(row), 'Operation completed successfully');
  }

  async deleteSalaryOverride(userId: string, month: string) {
    const referenceMonth = this.calc.monthStart(month);
    const existing = await this.prisma.monthlySalaryOverride.findUnique({
      where: {
        userId_referenceMonth: { userId, referenceMonth },
      },
    });
    if (!existing) {
      throw new NotFoundException('Ajuste de salário não encontrado para este mês.');
    }

    await this.prisma.monthlySalaryOverride.delete({
      where: { id: existing.id },
    });

    await this.audit.log({
      userId,
      entity: 'MonthlySalaryOverride',
      entityId: existing.id,
      action: 'DELETE',
      oldValue: {
        amount: existing.amount.toString(),
        note: existing.note,
        month,
      },
    });

    return ok({ month }, 'Operation completed successfully');
  }

  private mapSalaryOverride(row: {
    id: string;
    referenceMonth: Date;
    amount: { toString(): string };
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const month = row.referenceMonth.toISOString().slice(0, 7);
    return {
      id: row.id,
      month,
      amount: row.amount.toString(),
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
