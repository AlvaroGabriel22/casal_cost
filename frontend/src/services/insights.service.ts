import { api, type ApiSuccess } from '../api/client';

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
  history: Array<{ month: string; value: number }>;
  positives: string[];
  attentions: string[];
  factors: ScoreFactor[];
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
