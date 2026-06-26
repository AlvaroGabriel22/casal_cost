import { ExpenseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { OccurrenceGenerationService } from './occurrence-generation.service';
export type FinancialStatusLabel = 'POSITIVE' | 'ATTENTION' | 'NEGATIVE';
export type IndividualStatementSource = 'ALL' | 'INDIVIDUAL' | 'SHARED';
export declare class FinancialCalculationService {
    private readonly prisma;
    private readonly permission;
    private readonly occurrences;
    constructor(prisma: PrismaService, permission: PermissionService, occurrences: OccurrenceGenerationService);
    monthStart(ym: string): Date;
    private atStartOfDay;
    private atMonthStart;
    effectiveOccurrenceStatus(status: ExpenseStatus, dueDate: Date, asOf?: Date): ExpenseStatus;
    calculateSharedExpenseResponsibility(expenseId: string, fullAmount: Prisma.Decimal, userId: string): Promise<Prisma.Decimal>;
    private incomeAppliesToMonth;
    private ensureRecurringOccurrencesForIndividualMonth;
    private ensureRecurringOccurrencesForCoupleMonth;
    getFinancialStatus(totalIncome: Prisma.Decimal, totalExpenses: Prisma.Decimal): FinancialStatusLabel;
    calculateIncome(userId: string, month: Date, baseSalary: Prisma.Decimal): Promise<{
        baseSalaryMonth: Prisma.Decimal;
        extraIncomeMonth: Prisma.Decimal;
        totalIncomeMonth: Prisma.Decimal;
    }>;
    calculateIndividualMonth(userId: string, monthYm: string): Promise<{
        month: string;
        totalIncomeMonth: string;
        baseSalaryMonth: string;
        extraIncomeMonth: string;
        totalIndividualExpensesMonth: string;
        totalSharedExpensesResponsibilityMonth: string;
        totalExpensesMonth: string;
        balanceMonth: string;
        status: FinancialStatusLabel;
        upcomingBills: {
            id: string;
            title: string;
            dueDate: Date;
            amount: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
        }[];
        paidBills: {
            id: string;
            title: string;
            dueDate: Date;
            paymentDate: Date | null;
            amount: string;
            status: "PAID";
        }[];
        expensesByCategory: {
            category: string;
            amount: string;
        }[];
        futureProjection: unknown[];
    }>;
    getIndividualStatement(userId: string, params: {
        monthYm: string;
        name?: string;
        source?: IndividualStatementSource;
    }): Promise<{
        month: string;
        source: IndividualStatementSource;
        totalAmount: string;
        individualTotal: string;
        sharedResponsibilityTotal: string;
        paidTotal: string;
        pendingTotal: string;
        overdueTotal: string;
        bankDebitTotal: string;
        bankCreditTotal: string;
        items: {
            id: string;
            occurrenceId: string;
            expenseId: string;
            title: string;
            description: string | null;
            category: string;
            source: string;
            sourceLabel: string;
            amount: string;
            originalAmount: string;
            dueDate: Date;
            paymentDate: Date | null;
            referenceMonth: Date;
            status: "PENDING" | "PAID" | "OVERDUE";
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            installmentNumber: number | null;
            totalInstallments: number | null;
            createdBy: {
                id: string;
                name: string;
                username: string;
            } | null;
        }[];
        bankItems: {
            id: string;
            title: string;
            description: string;
            category: string;
            source: "BANK_IMPORT";
            sourceLabel: string;
            amount: string;
            transactionDate: Date;
            referenceMonth: Date;
            direction: string;
            bank: string;
            bankLabel: string;
            paymentMethod: string | null;
        }[];
    }>;
    calculateCoupleMonth(coupleId: string, monthYm: string): Promise<{
        month: string;
        totalSharedExpenses: string;
        paidTotal: string;
        pendingTotal: string;
        overdueTotal: string;
        cancelledTotal: string;
        categoryDistribution: {
            category: string;
            amount: string;
        }[];
        partnerResponsibility: Record<string, string>;
        partnerResponsibilities: {
            id: string;
            name: string;
            username: string;
            total: string;
        }[];
        monthlyEvolution: never[];
    }>;
    calculateRecurringExpenses(expenseId: string, month: Date): Promise<Prisma.Decimal>;
    calculateInstallments(userId: string, month: Date): Promise<Prisma.Decimal>;
}
