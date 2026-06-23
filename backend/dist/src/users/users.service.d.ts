import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
export declare class UsersService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    getMe(userId: string): Promise<{
        success: true;
        data: {
            id: string;
            name: string;
            username: string;
            email: string;
            financialSettings: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                baseSalary: import("@prisma/client/runtime/library").Decimal;
                salaryPaymentDay: number;
                defaultCurrency: string;
            } | null;
        };
        message: string;
    }>;
    updateMe(userId: string, body: {
        name?: string;
        email?: string;
    }): Promise<{
        success: true;
        data: {
            id: string;
            name: string;
            username: string;
            email: string;
        };
        message: string;
    }>;
    updateSalary(userId: string, body: {
        baseSalary: number;
        salaryPaymentDay?: number;
    }): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            baseSalary: import("@prisma/client/runtime/library").Decimal;
            salaryPaymentDay: number;
            defaultCurrency: string;
        };
        message: string;
    }>;
}
