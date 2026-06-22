import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
export declare class CouplesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    invite(userId: string, partnerUsername: string): unknown;
    accept(userId: string): unknown;
    me(userId: string): unknown;
    disable(userId: string, coupleId: string): unknown;
}
