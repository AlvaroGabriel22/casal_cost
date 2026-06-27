import type { AuthUser } from '../auth/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { ConfirmPasswordDto, CreateExpenseDto, ExpensePaymentDto, PayMyShareDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { ExpenseListQueryDto, IndividualStatementQueryDto } from './dto/expense-query.dto';
export declare class ExpensesController {
    private readonly expenses;
    private readonly calc;
    constructor(expenses: ExpensesService, calc: FinancialCalculationService);
    private defaultYm;
    create(user: AuthUser, dto: CreateExpenseDto): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            ownerUserId: string | null;
            scope: import(".prisma/client").$Enums.ExpenseScope;
            title: string;
            description: string | null;
            category: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            paidByUserId: string | null;
            installmentGroupId: string | null;
        };
        message: string;
    }>;
    list(user: AuthUser, query: ExpenseListQueryDto): Promise<{
        success: true;
        data: {
            items: ({
                occurrences: {
                    id: string;
                    status: import(".prisma/client").$Enums.ExpenseStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    coupleId: string | null;
                    referenceMonth: Date;
                    dueDate: Date;
                    amount: import("@prisma/client/runtime/library").Decimal;
                    paymentDate: Date | null;
                    installmentNumber: number | null;
                    totalInstallments: number | null;
                    comment: string | null;
                    expenseId: string;
                    userId: string;
                }[];
            } & {
                id: string;
                status: import(".prisma/client").$Enums.ExpenseStatus;
                createdAt: Date;
                updatedAt: Date;
                ownerUserId: string | null;
                scope: import(".prisma/client").$Enums.ExpenseScope;
                title: string;
                description: string | null;
                category: string;
                totalAmount: import("@prisma/client/runtime/library").Decimal;
                expenseType: import(".prisma/client").$Enums.ExpenseType;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                cardName: string | null;
                deletedAt: Date | null;
                coupleId: string | null;
                paidByUserId: string | null;
                installmentGroupId: string | null;
            })[];
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        message: string;
    }>;
    statement(user: AuthUser, query: IndividualStatementQueryDto): Promise<{
        success: true;
        data: {
            month: string;
            source: import("../financial/financial-calculation.service").IndividualStatementSource;
            totalAmount: string;
            individualTotal: string;
            sharedResponsibilityTotal: string;
            paidTotal: string;
            pendingTotal: string;
            overdueTotal: string;
            bankDebitTotal: string;
            bankCreditTotal: string;
            items: never[];
            bankItems: never[];
            expensesConfirmedMonth?: undefined;
            confirmedAccountDebits?: undefined;
            confirmedCardDebits?: undefined;
        } | {
            month: string;
            source: import("../financial/financial-calculation.service").IndividualStatementSource;
            totalAmount: string;
            individualTotal: string;
            sharedResponsibilityTotal: string;
            paidTotal: string;
            pendingTotal: string;
            overdueTotal: string;
            bankDebitTotal: string;
            bankCreditTotal: string;
            expensesConfirmedMonth: string;
            confirmedAccountDebits: string;
            confirmedCardDebits: string;
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
                confirmedByStatement: boolean;
                reconciliationMatchType: import(".prisma/client").$Enums.ReconciliationMatchType | null;
            }[];
            bankItems: {
                id: string;
                title: string;
                description: string;
                category: string;
                source: "BANK_IMPORT";
                sourceLabel: string;
                sourceType: string;
                amount: string;
                transactionDate: Date;
                referenceMonth: Date;
                direction: string;
                bank: string;
                bankLabel: string;
                paymentMethod: string | null;
            }[];
        };
        message: string;
    }>;
    one(user: AuthUser, id: string): Promise<{
        success: true;
        data: {
            paidBy: {
                id: string;
                name: string;
                username: string;
            } | null;
            installmentGroup: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                totalAmount: import("@prisma/client/runtime/library").Decimal;
                coupleId: string | null;
                totalInstallments: number;
                userId: string | null;
                firstReferenceMonth: Date;
            } | null;
            occurrences: {
                id: string;
                status: import(".prisma/client").$Enums.ExpenseStatus;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                coupleId: string | null;
                referenceMonth: Date;
                dueDate: Date;
                amount: import("@prisma/client/runtime/library").Decimal;
                paymentDate: Date | null;
                installmentNumber: number | null;
                totalInstallments: number | null;
                comment: string | null;
                expenseId: string;
                userId: string;
            }[];
            recurrenceRule: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                expenseId: string;
                frequency: import(".prisma/client").$Enums.RecurrenceFrequency;
                startDate: Date;
                endDate: Date | null;
                dayOfMonth: number | null;
            } | null;
            sharedSplits: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                expenseId: string;
                userId: string;
                splitType: import(".prisma/client").$Enums.SplitType;
                percentage: import("@prisma/client/runtime/library").Decimal | null;
                fixedAmount: import("@prisma/client/runtime/library").Decimal | null;
            }[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            ownerUserId: string | null;
            scope: import(".prisma/client").$Enums.ExpenseScope;
            title: string;
            description: string | null;
            category: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            paidByUserId: string | null;
            installmentGroupId: string | null;
        };
        message: string;
    }>;
    update(user: AuthUser, id: string, dto: UpdateExpenseDto): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            ownerUserId: string | null;
            scope: import(".prisma/client").$Enums.ExpenseScope;
            title: string;
            description: string | null;
            category: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            paidByUserId: string | null;
            installmentGroupId: string | null;
        };
        message: string;
    }>;
    remove(user: AuthUser, id: string, dto: ConfirmPasswordDto): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            ownerUserId: string | null;
            scope: import(".prisma/client").$Enums.ExpenseScope;
            title: string;
            description: string | null;
            category: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            paidByUserId: string | null;
            installmentGroupId: string | null;
        };
        message: string;
    }>;
    pay(user: AuthUser, id: string, dto: ExpensePaymentDto): Promise<{
        success: true;
        data: ({
            occurrences: {
                id: string;
                status: import(".prisma/client").$Enums.ExpenseStatus;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                coupleId: string | null;
                referenceMonth: Date;
                dueDate: Date;
                amount: import("@prisma/client/runtime/library").Decimal;
                paymentDate: Date | null;
                installmentNumber: number | null;
                totalInstallments: number | null;
                comment: string | null;
                expenseId: string;
                userId: string;
            }[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            ownerUserId: string | null;
            scope: import(".prisma/client").$Enums.ExpenseScope;
            title: string;
            description: string | null;
            category: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            paidByUserId: string | null;
            installmentGroupId: string | null;
        }) | null;
        message: string;
    }>;
    payMyShare(user: AuthUser, id: string, dto: PayMyShareDto): Promise<{
        success: true;
        data: {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            paymentDate: Date | null;
            userId: string;
            occurrenceId: string;
        };
        message: string;
    }>;
    cancel(user: AuthUser, id: string, dto: ExpensePaymentDto): Promise<{
        success: true;
        data: ({
            occurrences: {
                id: string;
                status: import(".prisma/client").$Enums.ExpenseStatus;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                coupleId: string | null;
                referenceMonth: Date;
                dueDate: Date;
                amount: import("@prisma/client/runtime/library").Decimal;
                paymentDate: Date | null;
                installmentNumber: number | null;
                totalInstallments: number | null;
                comment: string | null;
                expenseId: string;
                userId: string;
            }[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ExpenseStatus;
            createdAt: Date;
            updatedAt: Date;
            ownerUserId: string | null;
            scope: import(".prisma/client").$Enums.ExpenseScope;
            title: string;
            description: string | null;
            category: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            cardName: string | null;
            deletedAt: Date | null;
            coupleId: string | null;
            paidByUserId: string | null;
            installmentGroupId: string | null;
        }) | null;
        message: string;
    }>;
}
