import { PrismaService } from '../prisma/prisma.service';
import { BankSpendingAnalysis } from '../insights/bank-statement-analysis.service';
import { UpsertFinanceContextRuleDto } from './dto/finance-context.dto';
export interface FinanceContextRuleDto {
    id: string;
    matchLabel: string;
    displayLabel: string;
    category: string | null;
    motive: string;
    isRecurring: boolean;
    createdAt: string;
}
export interface FinanceContextQuestionDto {
    id: string;
    matchLabel: string;
    displayLabel: string;
    sampleAmount: number | null;
    occurrences: number;
    prompt: string;
}
export interface FinanceContextPayload {
    rules: FinanceContextRuleDto[];
    questions: FinanceContextQuestionDto[];
}
export declare class FinanceContextService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listRules(userId: string): Promise<FinanceContextRuleDto[]>;
    getPayload(userId: string): Promise<FinanceContextPayload>;
    listOpenQuestions(userId: string): Promise<FinanceContextQuestionDto[]>;
    createRule(userId: string, dto: UpsertFinanceContextRuleDto): Promise<FinanceContextRuleDto>;
    updateRule(userId: string, ruleId: string, dto: UpsertFinanceContextRuleDto): Promise<FinanceContextRuleDto>;
    deleteRule(userId: string, ruleId: string): Promise<{
        deleted: boolean;
    }>;
    answerQuestion(userId: string, questionId: string, dto: UpsertFinanceContextRuleDto): Promise<FinanceContextRuleDto>;
    dismissQuestion(userId: string, questionId: string): Promise<{
        dismissed: boolean;
    }>;
    syncQuestionsFromSpending(userId: string, spending: BankSpendingAnalysis | null): Promise<void>;
    formatRulesForRag(rules: FinanceContextRuleDto[]): string[];
    invalidateRagIndex(userId: string): Promise<void>;
    private touchRuleSideEffects;
    private pickQuestionCandidates;
    private toRuleDto;
    private toQuestionDto;
    private brl;
}
