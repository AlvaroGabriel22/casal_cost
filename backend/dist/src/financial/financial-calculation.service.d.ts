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
    calculateIncome(userId: string, month: Date, baseSalary: Prisma.Decimal): unknown;
    calculateIndividualMonth(userId: string, monthYm: string): unknown;
    getIndividualStatement(userId: string, params: {
        monthYm: string;
        name?: string;
        source?: IndividualStatementSource;
    }): unknown;
    calculateCoupleMonth(coupleId: string, monthYm: string): unknown;
    calculateRecurringExpenses(expenseId: string, month: Date): Promise<Prisma.Decimal>;
    calculateInstallments(userId: string, month: Date): Promise<Prisma.Decimal>;
}
