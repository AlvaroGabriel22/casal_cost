import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
export declare class UsersService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    getMe(userId: string): unknown;
    updateMe(userId: string, body: {
        name?: string;
        email?: string;
    }): unknown;
    updateSalary(userId: string, body: {
        baseSalary: number;
        salaryPaymentDay?: number;
    }): unknown;
}
