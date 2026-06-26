import { PrismaService } from '../prisma/prisma.service';
import { ContextRuleLike } from '../finance-context/finance-context.matcher';
export interface BankAnalysisInsight {
    id: string;
    tone: 'POSITIVE' | 'ATTENTION' | 'CRITICAL' | 'INFO';
    title: string;
    message: string;
    tip?: string;
}
export interface BankMonthBreakdown {
    month: string;
    totalIn: number;
    totalOut: number;
    net: number;
    investedApplied: number;
    investedRedeemed: number;
    netInvested: number;
    savedInAccount: number;
    untouchedInflow: number;
    transactionCount: number;
}
export interface InvestmentRedemptionEvent {
    date: string;
    month: string;
    amount: number;
}
export interface InvestmentLotTracking {
    id: string;
    appliedDate: string;
    appliedMonth: string;
    originalAmount: number;
    remainingAmount: number;
    status: 'ACTIVE' | 'PARTIAL' | 'REDEEMED';
    monthsHeldBeforeFirstRedemption: number;
    redemptions: InvestmentRedemptionEvent[];
    narrative: string;
}
export interface BankRecurringExpense {
    id: string;
    label: string;
    category: string;
    averageAmount: number;
    totalInPeriod: number;
    occurrences: number;
    monthsActive: number;
    isCrossMonthRecurring: boolean;
    annualizedEstimate: number;
    lastSeenMonth: string;
}
export interface BankSpendingCategoryRow {
    category: string;
    total: number;
    count: number;
    sharePercent: number;
}
export interface BankSpendingDetail {
    date: string;
    amount: number;
    merchant: string;
    category: string;
    detail: string;
    isRecurring: boolean;
    userMotive?: string;
    matchLabel?: string;
}
export interface BankSpendingAnalysis {
    referenceMonth: string;
    totalIncome: number;
    totalSpent: number;
    balance: number;
    spentMoreThanEarned: boolean;
    overspendAmount: number;
    deficitReason: string;
    topCategories: BankSpendingCategoryRow[];
    expenseDetails: BankSpendingDetail[];
    largestExpense: {
        date: string;
        amount: number;
        label: string;
        description: string;
        category: string;
    } | null;
    recurringExpenses: BankRecurringExpense[];
    actions: string[];
}
export interface BankStatementAnalysis {
    hasData: boolean;
    referenceMonth: string;
    banks: string[];
    monthsCovered: string[];
    totalMovements: number;
    currentlyInvested: number;
    totalAppliedAllTime: number;
    totalRedeemedAllTime: number;
    savedInAccountTotal: number;
    referenceMonthBreakdown: BankMonthBreakdown | null;
    monthlyBreakdown: BankMonthBreakdown[];
    investmentLots: InvestmentLotTracking[];
    spendingAnalysis: BankSpendingAnalysis | null;
    movementSummary: string[];
    insights: BankAnalysisInsight[];
    recommendations: string[];
}
export declare class BankStatementAnalysisService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    analyze(userId: string, referenceMonth: string, contextRules?: ContextRuleLike[]): Promise<BankStatementAnalysis>;
    formatForRag(analysis: BankStatementAnalysis): string[];
    private classify;
    private buildMonthlyBreakdown;
    private trackInvestmentLots;
    private lotToTracking;
    private composeInsights;
    private composeRecommendations;
    private composeSpendingAnalysis;
    private buildSmartExpenseDetail;
    private motiveGist;
    private shortMerchantName;
    private expenseDetailLabel;
    private isConsumptionDebit;
    private composeMovementSummary;
    private buildDirectActions;
    private buildDeficitReason;
    private groupRecurringExpenses;
    private toRecurringExpense;
    private merchantLabel;
    private summarizeExpenses;
    buildHealthObservations(analysis: BankStatementAnalysis): BankAnalysisInsight[];
    buildHealthSummary(scoreValue: number, delta: number, trend: 'UP' | 'DOWN' | 'STABLE', analysis: BankStatementAnalysis): string;
    private emptyAnalysis;
    private shortDesc;
    private brDate;
    private ym;
    private ymd;
    private monthLabel;
    private monthDiff;
    private round;
    private brl;
}
