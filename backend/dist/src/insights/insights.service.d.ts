import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { InvestmentsService } from '../investments/investments.service';
export type InsightPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type InsightKind = 'WARNING' | 'OPPORTUNITY' | 'POSITIVE' | 'NEUTRAL' | 'TREND';
export interface InsightCard {
    id: string;
    kind: InsightKind;
    title: string;
    description: string;
    impact: number;
    priority: InsightPriority;
    confidence: number;
    generatedAt: string;
    evidence?: string;
    tasks?: string[];
}
export interface ChallengeProgress {
    current: number;
    target: number;
    unit: 'BRL' | 'PERCENT' | 'COUNT';
    label: string;
}
export interface InsightChallenge {
    id: string;
    title: string;
    description: string;
    tasks: string[];
    estimatedSaving: number;
    priority: InsightPriority;
    difficulty: 'FACIL' | 'MODERADO' | 'DIFICIL';
    category?: string;
    kind: 'INVESTMENT' | 'SAVINGS' | 'MICRO_EXPENSE' | 'CATEGORY_CUT' | 'STREAK' | 'BALANCE';
    progress?: ChallengeProgress;
    xp: number;
    badge?: string;
    level: number;
}
export interface InvestmentScopeMetrics {
    monthTotal: number;
    allTimeTotal: number;
    averageMonthly: number;
    percentOfIncome: number;
    consecutiveMonths: number;
    vsPreviousMonth: number;
    contributionsInMonth: number;
    hasRegisteredContributions: boolean;
    byPartner?: Array<{
        userId: string;
        name: string;
        monthAmount: number;
        allTimeAmount: number;
    }>;
}
export interface InvestmentAnalysis {
    referenceMonth: string;
    targetPercent: number;
    individual: InvestmentScopeMetrics;
    couple: InvestmentScopeMetrics | null;
    history: Array<{
        month: string;
        individual: number;
        couple: number;
    }>;
}
export interface MicroExpense {
    id: string;
    title: string;
    category: string;
    amount: number;
    occurrences: number;
    annualImpact: number;
    insight: string;
}
export interface ScoreFactor {
    key: string;
    label: string;
    score: number;
    weight: number;
    status: 'GOOD' | 'WARNING' | 'BAD';
    detail: string;
}
export interface HealthScore {
    value: number;
    delta: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    history: Array<{
        month: string;
        value: number;
    }>;
    positives: string[];
    attentions: string[];
    factors: ScoreFactor[];
}
export interface Discovery {
    id: string;
    title: string;
    explanation: string;
    confidence: number;
    evidence: string;
    impact: number;
}
export interface RootCauseEntry {
    category: string;
    delta: number;
    percent: number;
    contribution: number;
}
export interface RootCauseAnalysis {
    previousMonth: string;
    currentMonth: string;
    totalDelta: number;
    entries: RootCauseEntry[];
    summary: string;
}
export interface Opportunity {
    id: string;
    title: string;
    description: string;
    annualImpact: number;
    difficulty: 'MUITO_BAIXA' | 'BAIXA' | 'MEDIA' | 'ALTA';
}
export interface CashFlowPoint {
    date: string;
    income: number;
    expense: number;
    balance: number;
    projected: boolean;
}
export interface CashFlowForecast {
    startingBalance: number;
    points: CashFlowPoint[];
    lowestBalance: number;
    lowestBalanceDate: string | null;
    riskOfNegative: boolean;
}
export interface WealthScenario {
    label: string;
    monthlyRate: number;
    projection: Array<{
        month: string;
        value: number;
    }>;
}
export interface WealthForecast {
    history: Array<{
        month: string;
        value: number;
    }>;
    scenarios: WealthScenario[];
    goal?: {
        label: string;
        value: number;
        targetMonth: string;
    };
}
export interface GoalSimulation {
    goalValue: number;
    baseMonths: number;
    actions: Array<{
        id: string;
        label: string;
        description: string;
        monthlyDelta: number;
        monthsAdvance: number;
    }>;
}
export interface Anomaly {
    id: string;
    title: string;
    expected: number;
    actual: number;
    percentChange: number;
    occurrenceMonth: string;
}
export interface Trend {
    id: string;
    label: string;
    monthlyChangePercent: number;
    projectedAnnualImpact: number;
    direction: 'UP' | 'DOWN' | 'STABLE';
}
export interface LifetimeImpact {
    horizonYears: number;
    current: number;
    optimized: number;
    monthlyDeltaApplied: number;
    difference: number;
    series: Array<{
        month: string;
        current: number;
        optimized: number;
    }>;
    notes: string;
}
export interface RiskAssessment {
    level: 'MUITO_BAIXO' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    score: number;
    reasons: string[];
}
export interface HabitsScore {
    value: number;
    positives: string[];
    attentions: string[];
}
export interface AssistantOverview {
    generatedAt: string;
    referenceMonth: string;
    monthsAnalyzed: number;
    transactionsAnalyzed: number;
    hasEnoughData: boolean;
    healthScore: HealthScore;
    investments: InvestmentAnalysis;
    habits: HabitsScore;
    challenges: InsightChallenge[];
    microExpenses: MicroExpense[];
    insights: InsightCard[];
}
export declare class InsightsService {
    private readonly prisma;
    private readonly calc;
    private readonly investments;
    private readonly logger;
    constructor(prisma: PrismaService, calc: FinancialCalculationService, investments: InvestmentsService);
    buildOverview(userId: string, monthYm?: string): Promise<AssistantOverview>;
    private snapshotMonth;
    private emptyMonth;
    private computeHealthScore;
    private scoreForSlice;
    private computeRootCause;
    private computeCashFlow;
    private estimateCurrentBalance;
    private computeWealthForecast;
    private buildScenario;
    private computeGoalSimulator;
    private monthsSaved;
    private detectAnomalies;
    private computeCategoryTrends;
    private computeTrends;
    private computeDiscoveries;
    private computeOpportunities;
    private composeInsights;
    private computeLifetimeImpact;
    private computeRisk;
    private computeHabits;
    private scopeMetrics;
    private loadInvestmentAnalysis;
    private detectMicroExpenses;
    private composeChallenges;
    private challengesToInsights;
    private countTransactions;
    private activeInstallmentsForUser;
    private avg;
    private coefficientOfVariation;
    private linearSlope;
    private clamp;
    private normaliseMonth;
    private currentYm;
    private ym;
    private addMonths;
    private lastMonths;
    private brl;
}
