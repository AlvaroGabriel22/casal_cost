import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/api-response';
import { PermissionService } from '../permission/permission.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateAccessDto, UpdateAccessDto } from './dto/access.dto';

@Injectable()
export class IndividualAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permission: PermissionService,
    private readonly audit: AuditLogService,
  ) {}

  async create(ownerId: string, body: CreateAccessDto) {
    if (!body.canView && body.canEdit) {
      throw new BadRequestException('Para permitir edição, é necessário também permitir visualização.');
    }
    const partner = await this.permission.getActiveCoupleForUser(ownerId);
    if (!partner || partner.partnerId !== body.allowedUserId) {
      throw new BadRequestException(
        'Você só pode conceder acesso ao seu parceiro do casal ativo.',
      );
    }

    const row = await this.prisma.individualAccountAccess.upsert({
      where: {
        ownerUserId_allowedUserId: {
          ownerUserId: ownerId,
          allowedUserId: body.allowedUserId,
        },
      },
      create: {
        ownerUserId: ownerId,
        allowedUserId: body.allowedUserId,
        canView: body.canView,
        canEdit: body.canEdit,
      },
      update: {
        canView: body.canView,
        canEdit: body.canEdit,
      },
    });
    await this.audit.log({
      userId: ownerId,
      entity: 'IndividualAccountAccess',
      entityId: row.id,
      action: 'CREATE',
      newValue: row,
    });
    return ok(row, 'Operation completed successfully');
  }

  async update(ownerId: string, id: string, body: UpdateAccessDto) {
    const row = await this.prisma.individualAccountAccess.findFirst({
      where: { id, ownerUserId: ownerId },
    });
    if (!row) throw new NotFoundException();
    const canView = body.canView ?? row.canView;
    const canEdit = body.canEdit ?? row.canEdit;
    if (!canView && canEdit) {
      throw new BadRequestException('Para permitir edição, é necessário também permitir visualização.');
    }
    const updated = await this.prisma.individualAccountAccess.update({
      where: { id },
      data: { canView, canEdit },
    });
    await this.audit.log({
      userId: ownerId,
      entity: 'IndividualAccountAccess',
      entityId: id,
      action: 'UPDATE',
      newValue: updated,
    });
    return ok(updated, 'Operation completed successfully');
  }

  async remove(ownerId: string, id: string) {
    const row = await this.prisma.individualAccountAccess.findFirst({
      where: { id, ownerUserId: ownerId },
    });
    if (!row) throw new NotFoundException();
    await this.prisma.individualAccountAccess.delete({ where: { id } });
    await this.audit.log({
      userId: ownerId,
      entity: 'IndividualAccountAccess',
      entityId: id,
      action: 'DELETE',
      oldValue: row,
    });
    return ok({ id }, 'Operation completed successfully');
  }

  async listForMe(userId: string) {
    const grantedToMe = await this.prisma.individualAccountAccess.findMany({
      where: { allowedUserId: userId },
      include: {
        owner: { select: { id: true, name: true, username: true } },
      },
    });
    const grantedByMe = await this.prisma.individualAccountAccess.findMany({
      where: { ownerUserId: userId },
      include: {
        allowed: { select: { id: true, name: true, username: true } },
      },
    });
    return ok({ grantedToMe, grantedByMe }, 'Operation completed successfully');
  }
}
