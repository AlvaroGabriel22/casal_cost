import { BankStatementEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export interface ConfirmedConsumptionMonth {
    month: string;
    total: number;
    accountDebits: number;
    cardDebits: number;
    excludedCardBillTotal: number;
    byCategory: Array<{
        category: string;
        amount: number;
    }>;
    entryCount: number;
}
export declare class StatementConsolidationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    monthStart(ym: string): Date;
    private resolveDueDay;
    monthsWithCardData(userId: string, monthYms?: string[]): Promise<Set<string>>;
    isConsumptionEntry(entry: Pick<BankStatementEntry, 'direction' | 'description' | 'sourceType' | 'category' | 'transactionDate' | 'bank'>, monthsWithCard: Set<string>, monthYm: string, dueDay: number): boolean;
    getConfirmedConsumption(userId: string, monthYm: string): Promise<ConfirmedConsumptionMonth>;
    private round;
}
