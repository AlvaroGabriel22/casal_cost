import type { AuthUser } from '../auth/current-user.decorator';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { FinancialProjectionService } from '../financial/financial-projection.service';
import { PermissionService } from '../permission/permission.service';
import { InvestmentsService } from '../investments/investments.service';
export declare class DashboardController {
    private readonly calc;
    private readonly projection;
    private readonly permission;
    private readonly investments;
    constructor(calc: FinancialCalculationService, projection: FinancialProjectionService, permission: PermissionService, investments: InvestmentsService);
    private defaultYm;
    individual(user: AuthUser, month?: string): Promise<{
        success: true;
        data: {
            futureProjection: {
                month: string;
                income: string;
                individualExpenses: string;
                sharedExpensesResponsibility: string;
                totalExpenses: string;
                balance: string;
                status: string;
            }[];
            investmentSummary: import("../investments/investment.types").InvestmentScopeSummary;
            month: string;
            totalIncomeMonth: string;
            baseSalaryMonth: string;
            defaultBaseSalary: string;
            salaryOverridden: boolean;
            salaryOverrideNote: string | null;
            extraIncomeMonth: string;
            totalIndividualExpensesMonth: string;
            totalSharedExpensesResponsibilityMonth: string;
            totalExpensesMonth: string;
            expensesPendingMonth: string;
            expensesConfirmedMonth: string;
            balanceMonth: string;
            balanceConfirmedMonth: string;
            hasStatementData: boolean;
            reconciledCount: number;
            statement: {
                confirmedAccountDebits: string;
                confirmedCardDebits: string;
                excludedCardBillTotal: string;
                expensesByCategoryConfirmed: {
                    category: string;
                    amount: string;
                }[];
            };
            status: import("../financial/financial-calculation.service").FinancialStatusLabel;
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
        };
        message: string;
    }>;
    couple(user: AuthUser, month?: string): Promise<{
        success: true;
        data: null;
        message: string;
    } | {
        success: true;
        data: {
            investmentSummary: import("../investments/investment.types").InvestmentScopeSummary;
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
        };
        message: string;
    }>;
    proj(user: AuthUser, months?: string): Promise<{
        success: true;
        data: {
            month: string;
            income: string;
            individualExpenses: string;
            sharedExpensesResponsibility: string;
            totalExpenses: string;
            balance: string;
            status: string;
        }[];
        message: string;
    }>;
}
