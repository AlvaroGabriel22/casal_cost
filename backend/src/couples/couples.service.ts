import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoupleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class CouplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async invite(userId: string, partnerUsername: string) {
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) throw new NotFoundException('Usuário não encontrado.');
    if (partnerUsername === me.username) {
      throw new BadRequestException('Você não pode convidar a si mesmo.');
    }
    const partner = await this.prisma.user.findFirst({
      where: { username: partnerUsername, deletedAt: null },
    });
    if (!partner) throw new NotFoundException('Usuário do parceiro não encontrado.');

    const existing = await this.prisma.couple.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: partner.id },
          { userAId: partner.id, userBId: userId },
        ],
        status: { in: [CoupleStatus.PENDING, CoupleStatus.ACTIVE] },
      },
    });
    if (existing) {
      throw new ConflictException('Já existe um convite ou um casal ativo com este parceiro.');
    }

    const couple = await this.prisma.couple.create({
      data: {
        userAId: userId,
        userBId: partner.id,
        status: CoupleStatus.PENDING,
      },
    });
    await this.audit.log({
      userId,
      entity: 'Couple',
      entityId: couple.id,
      action: 'CREATE',
      newValue: { status: CoupleStatus.PENDING },
    });
    return ok(couple, 'Operation completed successfully');
  }

  async accept(userId: string) {
    const pending = await this.prisma.couple.findFirst({
      where: { userBId: userId, status: CoupleStatus.PENDING },
    });
    if (!pending) {
      throw new NotFoundException('Não há convites pendentes para aceitar.');
    }
    const updated = await this.prisma.couple.update({
      where: { id: pending.id },
      data: { status: CoupleStatus.ACTIVE },
    });
    await this.audit.log({
      userId,
      entity: 'Couple',
      entityId: updated.id,
      action: 'UPDATE',
      newValue: { status: CoupleStatus.ACTIVE },
    });
    return ok(updated, 'Operation completed successfully');
  }

  async me(userId: string) {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: CoupleStatus.ACTIVE,
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });
    return ok(couple, 'Operation completed successfully');
  }

  async disable(userId: string, coupleId: string) {
    const c = await this.prisma.couple.findFirst({
      where: {
        id: coupleId,
        OR: [{ userAId: userId }, { userBId: userId }],
        status: CoupleStatus.ACTIVE,
      },
    });
    if (!c) throw new NotFoundException('Casal ativo não encontrado.');
    const updated = await this.prisma.couple.update({
      where: { id: coupleId },
      data: { status: CoupleStatus.DISABLED },
    });
    await this.audit.log({
      userId,
      entity: 'Couple',
      entityId: coupleId,
      action: 'UPDATE',
      newValue: { status: CoupleStatus.DISABLED },
    });
    return ok(updated, 'Operation completed successfully');
  }
}
