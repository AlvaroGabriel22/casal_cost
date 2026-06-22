import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string | null;
    entity: string;
    entityId: string;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        oldValue: params.oldValue as object | undefined,
        newValue: params.newValue as object | undefined,
      },
    });
  }
}
