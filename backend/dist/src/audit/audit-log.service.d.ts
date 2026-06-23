import { PrismaService } from '../prisma/prisma.service';
export declare class AuditLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(params: {
        userId?: string | null;
        entity: string;
        entityId: string;
        action: string;
        oldValue?: unknown;
        newValue?: unknown;
    }): Promise<void>;
}
