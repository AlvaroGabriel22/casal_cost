import type { AuthUser } from '../auth/current-user.decorator';
import { ExpensesService } from '../expenses/expenses.service';
import { ConfirmPasswordDto, CreateExpenseDto, ExpensePaymentDto, UpdateExpenseDto } from '../expenses/dto/create-expense.dto';
import { ExpenseListQueryDto } from '../expenses/dto/expense-query.dto';
export declare class CoupleExpensesController {
    private readonly expenses;
    constructor(expenses: ExpensesService);
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
                paidBy: {
                    id: string;
                    name: string;
                    username: string;
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
            })[];
            page: number;
            limit: number;
            total: number;
            totalPages: number;
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
}
