import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import type { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
export declare class IncomesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditLogService);
    private refMonth;
    create(userId: string, dto: CreateIncomeDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            receivedDate: Date | null;
            description: string | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            amount: Prisma.Decimal;
            userId: string;
            type: import(".prisma/client").$Enums.IncomeType;
            isRecurring: boolean;
            recurrenceStartDate: Date | null;
            recurrenceEndDate: Date | null;
        };
        message: string;
    }>;
    list(userId: string, page?: number, limit?: number): Promise<{
        success: true;
        data: {
            items: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                receivedDate: Date | null;
                description: string | null;
                deletedAt: Date | null;
                referenceMonth: Date;
                amount: Prisma.Decimal;
                userId: string;
                type: import(".prisma/client").$Enums.IncomeType;
                isRecurring: boolean;
                recurrenceStartDate: Date | null;
                recurrenceEndDate: Date | null;
            }[];
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        message: string;
    }>;
    update(userId: string, id: string, dto: UpdateIncomeDto): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            receivedDate: Date | null;
            description: string | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            amount: Prisma.Decimal;
            userId: string;
            type: import(".prisma/client").$Enums.IncomeType;
            isRecurring: boolean;
            recurrenceStartDate: Date | null;
            recurrenceEndDate: Date | null;
        };
        message: string;
    }>;
    remove(userId: string, id: string): Promise<{
        success: true;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            receivedDate: Date | null;
            description: string | null;
            deletedAt: Date | null;
            referenceMonth: Date;
            amount: Prisma.Decimal;
            userId: string;
            type: import(".prisma/client").$Enums.IncomeType;
            isRecurring: boolean;
            recurrenceStartDate: Date | null;
            recurrenceEndDate: Date | null;
        };
        message: string;
    }>;
}
