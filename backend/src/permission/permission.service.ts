import { Injectable, NotFoundException } from '@nestjs/common';
import { CoupleStatus, ExpenseScope, ExpenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { throwForbiddenAccess } from '../common/http-exceptions';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCoupleForUser(userId: string): Promise<{
    coupleId: string;
    partnerId: string;
  } | null> {
    const c = await this.prisma.couple.findFirst({
      where: {
        status: CoupleStatus.ACTIVE,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    if (!c) return null;
    const partnerId = c.userAId === userId ? c.userBId : c.userAId;
    return { coupleId: c.id, partnerId };
  }

  async assertCoupleMembership(userId: string, coupleId: string): Promise<void> {
    const c = await this.prisma.couple.findFirst({
      where: {
        id: coupleId,
        status: CoupleStatus.ACTIVE,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    if (!c) {
      throwForbiddenAccess('Você não faz parte deste casal.');
    }
  }

  async canViewIndividualAccount(
    viewerId: string,
    ownerId: string,
  ): Promise<boolean> {
    if (viewerId === ownerId) return true;
    const row = await this.prisma.individualAccountAccess.findUnique({
      where: {
        ownerUserId_allowedUserId: {
          ownerUserId: ownerId,
          allowedUserId: viewerId,
        },
      },
    });
    return !!row?.canView;
  }

  async canEditIndividualAccount(
    editorId: string,
    ownerId: string,
  ): Promise<boolean> {
    if (editorId === ownerId) return true;
    const row = await this.prisma.individualAccountAccess.findUnique({
      where: {
        ownerUserId_allowedUserId: {
          ownerUserId: ownerId,
          allowedUserId: editorId,
        },
      },
    });
    return !!row?.canEdit;
  }

  async assertIndividualAccess(
    viewerId: string,
    ownerId: string,
    requireEdit: boolean,
  ): Promise<void> {
    if (viewerId === ownerId) return;
    const ok = requireEdit
      ? await this.canEditIndividualAccount(viewerId, ownerId)
      : await this.canViewIndividualAccount(viewerId, ownerId);
    if (!ok) {
      throwForbiddenAccess('Você não tem permissão para acessar estas finanças individuais.');
    }
  }

  async assertExpenseReadable(
    userId: string,
    expense: {
      scope: ExpenseScope;
      ownerUserId: string | null;
      coupleId: string | null;
    },
  ): Promise<void> {
    if (expense.scope === ExpenseScope.SHARED) {
      if (!expense.coupleId)
        throw new NotFoundException('Despesa compartilhada sem casal associado.');
      await this.assertCoupleMembership(userId, expense.coupleId);
      return;
    }
    if (!expense.ownerUserId) throw new NotFoundException('Despesa inválida.');
    await this.assertIndividualAccess(userId, expense.ownerUserId, false);
  }

  async assertExpenseEditable(
    userId: string,
    expense: {
      scope: ExpenseScope;
      ownerUserId: string | null;
      coupleId: string | null;
      expenseType: ExpenseType;
    },
  ): Promise<void> {
    if (expense.scope === ExpenseScope.SHARED) {
      if (!expense.coupleId)
        throw new NotFoundException('Despesa compartilhada sem casal associado.');
      await this.assertCoupleMembership(userId, expense.coupleId);
      return;
    }
    if (!expense.ownerUserId) throw new NotFoundException('Despesa inválida.');
    await this.assertIndividualAccess(userId, expense.ownerUserId, true);
  }
}
