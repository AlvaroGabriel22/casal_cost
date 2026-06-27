import { PrismaService } from '../prisma/prisma.service';
export declare class StatementReconciliationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    reconcileAfterAccountImport(userId: string, monthsCovered: string[]): Promise<{
        matched: number;
        skipped: number;
    }>;
    reconcileMonth(userId: string, monthYm: string): Promise<{
        matched: number;
        skipped: number;
    }>;
    revertForImport(userId: string, importId: string): Promise<number>;
    private titleMatchScore;
}
