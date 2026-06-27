import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
export declare class UsersService {
    private readonly prisma;
    private readonly audit;
    private readonly calc;
    constructor(prisma: PrismaService, audit: AuditLogService, calc: FinancialCalculationService);
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
    listSalaryOverrides(userId: string, month?: string): Promise<{
        success: true;
        data: {
            id: string;
            month: string;
            amount: string;
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        message: string;
    }>;
    upsertSalaryOverride(userId: string, body: {
        month: string;
        amount: number;
        note?: string;
    }): Promise<{
        success: true;
        data: {
            id: string;
            month: string;
            amount: string;
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        message: string;
    }>;
    deleteSalaryOverride(userId: string, month: string): Promise<{
        success: true;
        data: {
            month: string;
        };
        message: string;
    }>;
    private mapSalaryOverride;
}
