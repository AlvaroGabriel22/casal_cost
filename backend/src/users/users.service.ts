import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
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
}
