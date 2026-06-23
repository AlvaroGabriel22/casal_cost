import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
export declare class CouplesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    invite(userId: string, partnerUsername: string): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        };
        message: string;
    }>;
    accept(userId: string): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        };
        message: string;
    }>;
    me(userId: string): Promise<{
        success: true;
        data: ({
            userA: {
                id: string;
                name: string;
                username: string;
                email: string;
            };
            userB: {
                id: string;
                name: string;
                username: string;
                email: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        }) | null;
        message: string;
    }>;
    disable(userId: string, coupleId: string): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            createdAt: Date;
            updatedAt: Date;
            userAId: string;
            userBId: string;
        };
        message: string;
    }>;
}
