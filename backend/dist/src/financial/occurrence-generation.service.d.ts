import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class OccurrenceGenerationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private monthAt;
    ensureMonthlyOccurrence(params: {
        expenseId: string;
        userId: string;
        coupleId: string | null;
        referenceMonth: Date;
        amount: Prisma.Decimal | string;
        dueDay: number;
    }): Promise<void>;
    generateInstallmentOccurrences(params: {
        expenseId: string;
        userId: string;
        coupleId: string | null;
        installmentAmount: Prisma.Decimal;
        totalInstallments: number;
        firstReferenceMonth: Date;
        dueDay?: number;
    }): Promise<void>;
    expandRecurringForMonth(expenseId: string, referenceMonth: Date): Promise<void>;
    private atMonthStart;
    private atMonthEnd;
    createOneTimeOccurrence(params: {
        expenseId: string;
        userId: string;
        coupleId: string | null;
        referenceMonth: Date;
        amount: Prisma.Decimal;
        dueDate: Date;
    }): Promise<void>;
}
