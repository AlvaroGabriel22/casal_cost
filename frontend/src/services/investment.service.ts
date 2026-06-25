import { api, type ApiSuccess } from '../api/client';

export type InvestmentScope = 'INDIVIDUAL' | 'COUPLE';

export type InvestmentContribution = {
  id: string;
  userId: string;
  coupleId?: string | null;
  scope: InvestmentScope;
  amount: string | number;
  referenceMonth: string;
  contributedAt?: string | null;
  description?: string | null;
  createdAt: string;
  user?: { id: string; name: string; username: string };
};

export type InvestmentListResponse = {
  items: InvestmentContribution[];
  contributionsInMonth: number;
  monthTotal: string;
  allTimeTotal: string;
  history: Array<{ month: string; amount: string }>;
};

export const investmentService = {
  async list(scope: InvestmentScope, month?: string) {
    const { data } = await api.get<ApiSuccess<InvestmentListResponse>>('/investments', {
      params: { scope, month },
    });
    return data.data;
  },

  async create(body: {
    scope: InvestmentScope;
    amount: number;
    referenceMonth: string;
    contributedAt?: string;
    description?: string;
  }) {
    const { data } = await api.post<ApiSuccess<InvestmentContribution>>('/investments', body);
    return data.data;
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiSuccess<InvestmentContribution>>(`/investments/${id}`);
    return data.data;
  },
};
