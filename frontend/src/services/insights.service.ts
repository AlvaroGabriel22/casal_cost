import { api, type ApiSuccess } from '../api/client';
import type { FinanceContextPayload } from './finance-context.service';

export type InsightPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type InsightKind =
  | 'WARNING'
  | 'OPPORTUNITY'
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'TREND';

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

export interface HealthObservation {
  id: string;
  tone: 'POSITIVE' | 'ATTENTION' | 'CRITICAL' | 'INFO';
  title: string;
  message: string;
  tip?: string;
}

export interface HealthScore {
  value: number;
  delta: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  history: Array<{ month: string; value: number }>;
  summary: string;
  observations: HealthObservation[];
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
  history: Array<{ month: string; individual: number; couple: number }>;
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

export interface HabitsScore {
  value: number;
  positives: string[];
  attentions: string[];
}

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

export interface AssistantOverview {
  generatedAt: string;
  referenceMonth: string;
  monthsAnalyzed: number;
  transactionsAnalyzed: number;
  hasEnoughData: boolean;
  healthScore: HealthScore;
  investments: InvestmentAnalysis;
  habits: HabitsScore;
  bankAnalysis: BankStatementAnalysis;
  financeContext: FinanceContextPayload;
  challenges: InsightChallenge[];
  microExpenses: MicroExpense[];
  insights: InsightCard[];
}

export const insightsService = {
  async overview(month?: string): Promise<AssistantOverview> {
    const params = month ? { month } : undefined;
    const { data } = await api.get<ApiSuccess<AssistantOverview>>(
      '/assistant/insights/overview',
      { params },
    );
    return data.data;
  },
};
