import { InvestmentScope } from '@prisma/client';

export type PartnerContribution = {
  userId: string;
  name: string;
  monthAmount: number;
  allTimeAmount: number;
};

export type InvestmentScopeSummary = {
  scope: InvestmentScope;
  referenceMonth: string;
  monthTotal: number;
  previousMonthTotal: number;
  allTimeTotal: number;
  averageMonthly: number;
  consecutiveMonths: number;
  contributionsInMonth: number;
  contributionsAllTime: number;
  byPartner?: PartnerContribution[];
  monthlyHistory: Array<{ month: string; amount: number }>;
};

export type InvestmentOverview = {
  referenceMonth: string;
  targetPercent: number;
  individual: InvestmentScopeSummary;
  couple: InvestmentScopeSummary | null;
};
