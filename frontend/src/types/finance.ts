export type User = {
  id: string;
  name: string;
  username: string;
  email?: string;
  financialSettings?: FinancialSettings | null;
};

export type FinancialSettings = {
  id: string;
  userId: string;
  baseSalary: string | number;
  salaryPaymentDay: number;
  defaultCurrency: string;
};

export type ExpenseStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type ExpenseScope = 'INDIVIDUAL' | 'SHARED';
export type ExpenseType =
  | 'ONE_TIME'
  | 'FIXED'
  | 'RECURRING'
  | 'INSTALLMENT'
  | 'FUTURE_CREDIT_CARD';
export type PaymentMethod =
  | 'BOLETO'
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'TRANSFER'
  | 'OTHER';
export type IncomeType =
  | 'SALARY'
  | 'BONUS'
  | 'PLR'
  | 'VACATION'
  | 'BENEFIT'
  | 'EXTRA_INCOME'
  | 'OTHER';

export type Occurrence = {
  id: string;
  title?: string;
  referenceMonth: string;
  dueDate: string;
  amount: string | number;
  status: ExpenseStatus;
  paymentDate?: string | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  comment?: string | null;
};

export type Expense = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  totalAmount: string | number;
  scope: ExpenseScope;
  expenseType: ExpenseType;
  paymentMethod: PaymentMethod;
  cardName?: string | null;
  /** Criador do registo (API Nest/Prisma); usado para alertas de despesas SHARED do parceiro */
  ownerUserId?: string | null;
  createdAt?: string;
  paidByUserId?: string | null;
  paidBy?: Pick<User, 'id' | 'name' | 'username'> | null;
  status: ExpenseStatus;
  occurrences?: Occurrence[];
  sharedSplits?: Array<{
    id: string;
    userId: string;
    splitType: 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT';
    percentage?: string | number | null;
    fixedAmount?: string | number | null;
  }>;
};

export type IndividualStatementSource = 'ALL' | 'INDIVIDUAL' | 'SHARED';

export type IndividualStatementItem = {
  id: string;
  occurrenceId: string;
  expenseId: string;
  title: string;
  description?: string | null;
  category: string;
  source: Extract<ExpenseScope, 'INDIVIDUAL' | 'SHARED'>;
  sourceLabel: string;
  amount: string | number;
  originalAmount: string | number;
  dueDate: string;
  paymentDate?: string | null;
  referenceMonth: string;
  status: ExpenseStatus;
  expenseType: ExpenseType;
  paymentMethod: PaymentMethod;
  cardName?: string | null;
  paidBy?: Pick<User, 'id' | 'name' | 'username'> | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  createdBy?: Pick<User, 'id' | 'name' | 'username'> | null;
};

export type IndividualStatement = {
  month: string;
  source: IndividualStatementSource;
  totalAmount: string | number;
  individualTotal: string | number;
  sharedResponsibilityTotal: string | number;
  paidTotal: string | number;
  pendingTotal: string | number;
  overdueTotal: string | number;
  items: IndividualStatementItem[];
};

export type Income = {
  id: string;
  type: IncomeType;
  description?: string | null;
  amount: string | number;
  referenceMonth: string;
  receivedDate?: string | null;
  isRecurring: boolean;
};

export type IndividualDashboard = {
  month: string;
  totalIncomeMonth: string | number;
  baseSalaryMonth: string | number;
  extraIncomeMonth: string | number;
  totalIndividualExpensesMonth: string | number;
  totalSharedExpensesResponsibilityMonth: string | number;
  totalExpensesMonth: string | number;
  balanceMonth: string | number;
  status: 'POSITIVE' | 'ATTENTION' | 'NEGATIVE';
  expensesByCategory?: Array<{ category: string; total?: string | number; amount?: string | number }>;
  upcomingBills?: Occurrence[];
  paidBills?: Occurrence[];
  futureProjection?: Array<{
    month: string;
    income?: string | number;
    expenses?: string | number;
    balance?: string | number;
    projectedBalance?: string | number;
  }>;
};

export type CoupleDashboard = {
  month: string;
  totalSharedExpenses: string | number;
  paidTotal: string | number;
  pendingTotal: string | number;
  overdueTotal: string | number;
  totalMonthlyResponsibility?: string | number;
  partnerResponsibilities?: Array<{ id?: string; name?: string; username?: string; total: string | number }>;
  partnerResponsibility?: Record<string, string | number>;
  expensesByCategory?: Array<{ category: string; total?: string | number; amount?: string | number }>;
  categoryDistribution?: Array<{ category: string; total?: string | number; amount?: string | number }>;
  evolution?: Array<{ month: string; total: string | number }>;
  monthlyEvolution?: Array<{ month: string; total: string | number }>;
  upcomingBills?: Occurrence[];
};

export type Couple = {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  userA?: User;
  userB?: User;
  userAId?: string;
  userBId?: string;
};

export type AccessRow = {
  id: string;
  ownerUserId: string;
  allowedUserId: string;
  canView: boolean;
  canEdit: boolean;
  owner?: Pick<User, 'id' | 'name' | 'username'>;
  allowed?: Pick<User, 'id' | 'name' | 'username'>;
};

export type InstallmentGroup = {
  id: string;
  title: string;
  totalAmount: string | number;
  totalInstallments: number;
  firstReferenceMonth: string;
  expenses?: Expense[];
};
