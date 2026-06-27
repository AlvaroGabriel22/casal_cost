import { api, type ApiSuccess, type Paginated } from '../api/client';
import type {
  AccessRow,
  Couple,
  CoupleDashboard,
  Expense,
  ExpenseScope,
  ExpenseStatus,
  ExpenseType,
  Income,
  IndividualStatement,
  IndividualStatementSource,
  IndividualDashboard,
  InstallmentGroup,
  MonthlySalaryOverride,
  PaymentMethod,
  User,
  UserCard,
} from '../types/finance';

export type ExpenseFilters = {
  month?: string;
  name?: string;
  status?: ExpenseStatus | '';
  category?: string;
  expenseType?: ExpenseType | '';
  paymentMethod?: PaymentMethod | '';
  page?: number;
  limit?: number;
};

export type ExpensePayload = {
  title: string;
  description?: string;
  category: string;
  totalAmount: number;
  expenseType: ExpenseType;
  paymentMethod: PaymentMethod;
  cardName?: string;
  paidByUserId?: string;
  referenceMonth?: string;
  dueDate?: string;
  recurrence?: {
    frequency: 'MONTHLY';
    startDate: string;
    endDate?: string;
    dayOfMonth?: number;
  };
  installment?: {
    totalInstallments: number;
    firstReferenceMonth: string;
  };
};

export type IndividualStatementFilters = {
  month?: string;
  name?: string;
  source?: IndividualStatementSource;
};

function cleanParams<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined),
  );
}

export const dashboardService = {
  async individual(month: string) {
    const { data } = await api.get<ApiSuccess<IndividualDashboard>>('/dashboard/individual', {
      params: { month },
    });
    return data.data;
  },

  async couple(month: string) {
    const { data } = await api.get<ApiSuccess<CoupleDashboard | null>>('/dashboard/couple', {
      params: { month },
    });
    return data.data;
  },
};

export const expenseService = {
  async list(scope: ExpenseScope, filters: ExpenseFilters) {
    const url = scope === 'SHARED' ? '/couple/expenses' : '/expenses';
    const { data } = await api.get<ApiSuccess<Paginated<Expense>>>(url, {
      params: cleanParams({ ...filters, scope: scope === 'INDIVIDUAL' ? scope : undefined }),
    });
    return data.data;
  },

  async create(scope: ExpenseScope, body: ExpensePayload) {
    const url = scope === 'SHARED' ? '/couple/expenses' : '/expenses';
    const { data } = await api.post<ApiSuccess<Expense>>(url, body);
    return data.data;
  },

  async update(scope: ExpenseScope, id: string, body: Partial<ExpensePayload>) {
    const url = scope === 'SHARED' ? `/couple/expenses/${id}` : `/expenses/${id}`;
    const { data } = await api.patch<ApiSuccess<Expense>>(url, body);
    return data.data;
  },

  async pay(scope: ExpenseScope, id: string, occurrenceId?: string, referenceMonth?: string) {
    const url = scope === 'SHARED' ? `/couple/expenses/${id}/pay` : `/expenses/${id}/pay`;
    const { data } = await api.patch<ApiSuccess<Expense>>(url, {
      occurrenceId,
      referenceMonth,
    });
    return data.data;
  },

  async payMyShare(id: string, occurrenceId: string, password: string) {
    const { data } = await api.patch<ApiSuccess<unknown>>(`/expenses/${id}/pay-my-share`, {
      occurrenceId,
      password,
    });
    return data.data;
  },

  async cancel(scope: ExpenseScope, id: string, occurrenceId?: string, referenceMonth?: string) {
    const url = scope === 'SHARED' ? `/couple/expenses/${id}/cancel` : `/expenses/${id}/cancel`;
    const { data } = await api.patch<ApiSuccess<Expense>>(url, {
      occurrenceId,
      referenceMonth,
    });
    return data.data;
  },

  async remove(scope: ExpenseScope, id: string, password: string) {
    const url = scope === 'SHARED' ? `/couple/expenses/${id}` : `/expenses/${id}`;
    const { data } = await api.delete<ApiSuccess<Expense>>(url, {
      data: { password },
    });
    return data.data;
  },

  async individualStatement(filters: IndividualStatementFilters) {
    const { data } = await api.get<ApiSuccess<IndividualStatement>>(
      '/expenses/statement/individual',
      {
        params: cleanParams(filters),
      },
    );
    return data.data;
  },
};

export const incomeService = {
  async list(page = 1, limit = 20) {
    const { data } = await api.get<ApiSuccess<Paginated<Income>>>('/incomes', {
      params: { page, limit },
    });
    return data.data;
  },

  async create(body: Record<string, unknown>) {
    const { data } = await api.post<ApiSuccess<Income>>('/incomes', body);
    return data.data;
  },

  async update(id: string, body: Record<string, unknown>) {
    const { data } = await api.patch<ApiSuccess<Income>>(`/incomes/${id}`, body);
    return data.data;
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiSuccess<Income>>(`/incomes/${id}`);
    return data.data;
  },
};

export const installmentService = {
  async list() {
    const { data } = await api.get<ApiSuccess<InstallmentGroup[]>>('/installments');
    return data.data;
  },

  async create(body: {
    title: string;
    description?: string;
    category: string;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    cardName?: string;
    paidByUserId?: string;
    totalInstallments: number;
    firstReferenceMonth: string;
    dueDay?: number;
    scope: ExpenseScope;
  }) {
    const { data } = await api.post<ApiSuccess<Expense>>('/installments', body);
    return data.data;
  },

  async update(
    id: string,
    body: Partial<{
      title: string;
      description?: string;
      category: string;
      totalAmount: number;
      paymentMethod: PaymentMethod;
      cardName?: string;
      paidByUserId?: string;
      totalInstallments: number;
    }>,
  ) {
    const { data } = await api.patch<ApiSuccess<InstallmentGroup>>(`/installments/${id}`, body);
    return data.data;
  },

  async pay(id: string, occurrenceIds?: string[]) {
    const { data } = await api.patch<ApiSuccess<InstallmentGroup>>(
      `/installments/${id}/pay`,
      occurrenceIds?.length ? { occurrenceIds } : {},
    );
    return data.data;
  },

  async remove(id: string, password: string) {
    const { data } = await api.delete<ApiSuccess<{ id: string }>>(`/installments/${id}`, {
      data: { password },
    });
    return data.data;
  },
};

export const cardService = {
  async list() {
    const { data } = await api.get<ApiSuccess<UserCard[]>>('/cards');
    return data.data;
  },

  async upsert(name: string, dueDay: number, closingDay?: number) {
    const { data } = await api.post<ApiSuccess<UserCard>>('/cards', {
      name,
      dueDay,
      ...(closingDay !== undefined ? { closingDay } : {}),
    });
    return data.data;
  },

  async update(id: string, body: { name?: string; dueDay?: number; closingDay?: number }) {
    const { data } = await api.patch<ApiSuccess<UserCard>>(`/cards/${id}`, body);
    return data.data;
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiSuccess<{ id: string }>>(`/cards/${id}`);
    return data.data;
  },
};

export const userService = {
  async me() {
    const { data } = await api.get<ApiSuccess<User>>('/users/me');
    return data.data;
  },

  async updateProfile(body: { name?: string; email?: string }) {
    const { data } = await api.patch<ApiSuccess<User>>('/users/me', body);
    return data.data;
  },

  async updateSalary(body: { baseSalary: number; salaryPaymentDay?: number }) {
    const { data } = await api.patch<ApiSuccess<User['financialSettings']>>(
      '/users/me/salary',
      body,
    );
    return data.data;
  },

  async listSalaryOverrides(month?: string) {
    const { data } = await api.get<ApiSuccess<MonthlySalaryOverride[]>>(
      '/users/me/salary/overrides',
      { params: month ? { month } : undefined },
    );
    return data.data;
  },

  async upsertSalaryOverride(body: { month: string; amount: number; note?: string }) {
    const { data } = await api.patch<ApiSuccess<MonthlySalaryOverride>>(
      '/users/me/salary/overrides',
      body,
    );
    return data.data;
  },

  async deleteSalaryOverride(month: string) {
    const { data } = await api.delete<ApiSuccess<{ month: string }>>(
      '/users/me/salary/overrides',
      { params: { month } },
    );
    return data.data;
  },
};

export const coupleService = {
  async me() {
    const { data } = await api.get<ApiSuccess<Couple | null>>('/couples/me');
    return data.data;
  },

  async invite(partnerUsername: string) {
    const { data } = await api.post<ApiSuccess<Couple>>('/couples/invite', {
      partnerUsername,
    });
    return data.data;
  },

  async accept() {
    const { data } = await api.post<ApiSuccess<Couple>>('/couples/accept');
    return data.data;
  },

  async disable(id: string) {
    const { data } = await api.delete<ApiSuccess<Couple>>(`/couples/${id}`);
    return data.data;
  },
};

export const permissionService = {
  async list() {
    const { data } = await api.get<
      ApiSuccess<{ grantedToMe: AccessRow[]; grantedByMe: AccessRow[] }>
    >('/individual-access/me');
    return data.data;
  },

  async create(body: { allowedUserId: string; canView: boolean; canEdit: boolean }) {
    const { data } = await api.post<ApiSuccess<AccessRow>>('/individual-access', body);
    return data.data;
  },

  async update(id: string, body: { canView?: boolean; canEdit?: boolean }) {
    const { data } = await api.patch<ApiSuccess<AccessRow>>(`/individual-access/${id}`, body);
    return data.data;
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiSuccess<{ id: string }>>(`/individual-access/${id}`);
    return data.data;
  },
};
