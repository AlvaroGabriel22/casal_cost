import { ReconciliationMatchType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export type ReconciliationOverview = {
    month: string;
    summary: {
        awaitingCount: number;
        awaitingTotal: string;
        unmatchedCount: number;
        unmatchedTotal: string;
        confirmedCount: number;
    };
    awaitingExtract: Array<{
        occurrenceId: string;
        title: string;
        amount: string;
        dueDate: string;
        paymentMethod: string;
        status: string;
    }>;
    unmatchedStatementDebits: Array<{
        entryId: string;
        description: string;
        amount: string;
        transactionDate: string;
    }>;
    confirmedMatches: Array<{
        matchId: string;
        title: string;
        entryDescription: string;
        amount: string;
        matchType: ReconciliationMatchType;
        confidence: number;
        paidAt: string;
    }>;
};
export declare class StatementReconciliationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    reconcileAfterAccountImport(userId: string, monthsCovered: string[]): Promise<{
        matched: number;
        skipped: number;
    }>;
    getOverview(userId: string, monthYm: string): Promise<ReconciliationOverview>;
    reconcileMonth(userId: string, monthYm: string): Promise<{
        matched: number;
        skipped: number;
    }>;
    revertForImport(userId: string, importId: string): Promise<number>;
    private titleMatchScore;
}
