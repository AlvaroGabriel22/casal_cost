import { api, type ApiSuccess } from '../api/client';

export interface FinanceContextRule {
  id: string;
  matchLabel: string;
  displayLabel: string;
  category: string | null;
  motive: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface FinanceContextQuestion {
  id: string;
  matchLabel: string;
  displayLabel: string;
  sampleAmount: number | null;
  occurrences: number;
  prompt: string;
}

export interface FinanceContextPayload {
  rules: FinanceContextRule[];
  questions: FinanceContextQuestion[];
}

export interface UpsertFinanceContextRuleInput {
  displayLabel: string;
  motive: string;
  category?: string;
  isRecurring?: boolean;
}

export const financeContextService = {
  async list(): Promise<FinanceContextPayload> {
    const { data } = await api.get<ApiSuccess<FinanceContextPayload>>(
      '/assistant/finance-context',
    );
    return data.data;
  },

  async createRule(input: UpsertFinanceContextRuleInput): Promise<FinanceContextRule> {
    const { data } = await api.post<ApiSuccess<FinanceContextRule>>(
      '/assistant/finance-context/rules',
      input,
    );
    return data.data;
  },

  async updateRule(
    id: string,
    input: UpsertFinanceContextRuleInput,
  ): Promise<FinanceContextRule> {
    const { data } = await api.patch<ApiSuccess<FinanceContextRule>>(
      `/assistant/finance-context/rules/${id}`,
      input,
    );
    return data.data;
  },

  async deleteRule(id: string) {
    await api.delete(`/assistant/finance-context/rules/${id}`);
  },

  async answerQuestion(
    id: string,
    input: UpsertFinanceContextRuleInput,
  ): Promise<FinanceContextRule> {
    const { data } = await api.post<ApiSuccess<FinanceContextRule>>(
      `/assistant/finance-context/questions/${id}/answer`,
      input,
    );
    return data.data;
  },

  async dismissQuestion(id: string) {
    await api.post(`/assistant/finance-context/questions/${id}/dismiss`);
  },
};
