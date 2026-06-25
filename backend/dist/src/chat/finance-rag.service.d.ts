import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { AiService } from '../ai/ai.service';
export declare class FinanceRagService {
    private readonly prisma;
    private readonly financial;
    private readonly ai;
    private readonly logger;
    constructor(prisma: PrismaService, financial: FinancialCalculationService, ai: AiService);
    private brl;
    private ym;
    private ymd;
    private currentYm;
    private addMonths;
    private getActiveCoupleId;
    private computeSignature;
    private buildDocuments;
    reindex(userId: string): Promise<number>;
    ensureIndex(userId: string): Promise<void>;
    retrieve(userId: string, queryEmbedding: number[], k?: number): Promise<string[]>;
    buildLiveSummary(userId: string): Promise<string>;
}
