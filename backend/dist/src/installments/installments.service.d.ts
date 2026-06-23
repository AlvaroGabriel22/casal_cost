import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { ExpensesService } from '../expenses/expenses.service';
import type { CreateInstallmentDto, DeleteInstallmentDto, PayInstallmentDto, UpdateInstallmentDto } from './dto/installment.dto';
export declare class InstallmentsService {
    private readonly prisma;
    private readonly permission;
    private readonly expenses;
    constructor(prisma: PrismaService, permission: PermissionService, expenses: ExpensesService);
    create(userId: string, dto: CreateInstallmentDto): Promise<{
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
            totalAmount: Prisma.Decimal;
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
    list(userId: string): Promise<{
        success: true;
        data: ({
            expenses: ({
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
                    amount: Prisma.Decimal;
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
                totalAmount: Prisma.Decimal;
                expenseType: import(".prisma/client").$Enums.ExpenseType;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                cardName: string | null;
                deletedAt: Date | null;
                coupleId: string | null;
                paidByUserId: string | null;
                installmentGroupId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: Prisma.Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        })[];
        message: string;
    }>;
    one(userId: string, id: string): Promise<{
        success: true;
        data: {
            expenses: ({
                paidBy: {
                    id: string;
                    name: string;
                    username: string;
                } | null;
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
                totalAmount: Prisma.Decimal;
                expenseType: import(".prisma/client").$Enums.ExpenseType;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                cardName: string | null;
                deletedAt: Date | null;
                coupleId: string | null;
                paidByUserId: string | null;
                installmentGroupId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: Prisma.Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        };
        message: string;
    }>;
    private findEditableGroup;
    update(userId: string, id: string, dto: UpdateInstallmentDto): Promise<{
        success: true;
        data: ({
            expenses: ({
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
                    amount: Prisma.Decimal;
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
                totalAmount: Prisma.Decimal;
                expenseType: import(".prisma/client").$Enums.ExpenseType;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                cardName: string | null;
                deletedAt: Date | null;
                coupleId: string | null;
                paidByUserId: string | null;
                installmentGroupId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: Prisma.Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        }) | null;
        message: string;
    }>;
    private monthAt;
    private dueDateFor;
    private rebuildInstallmentOccurrences;
    pay(userId: string, id: string, dto?: PayInstallmentDto): Promise<{
        success: true;
        data: ({
            expenses: ({
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
                    amount: Prisma.Decimal;
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
                totalAmount: Prisma.Decimal;
                expenseType: import(".prisma/client").$Enums.ExpenseType;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                cardName: string | null;
                deletedAt: Date | null;
                coupleId: string | null;
                paidByUserId: string | null;
                installmentGroupId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: Prisma.Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        }) | null;
        message: string;
    }>;
    private syncExpenseStatus;
    remove(userId: string, id: string, dto: DeleteInstallmentDto): Promise<{
        success: true;
        data: {
            id: string;
        };
        message: string;
    }>;
}
