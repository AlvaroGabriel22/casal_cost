import type { AuthUser } from '../auth/current-user.decorator';
import { InstallmentsService } from './installments.service';
import { CreateInstallmentDto, DeleteInstallmentDto, PayInstallmentDto, UpdateInstallmentDto } from './dto/installment.dto';
export declare class InstallmentsController {
    private readonly installments;
    constructor(installments: InstallmentsService);
    create(user: AuthUser, dto: CreateInstallmentDto): Promise<{
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
    list(user: AuthUser): Promise<{
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        })[];
        message: string;
    }>;
    one(user: AuthUser, id: string): Promise<{
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
                totalAmount: import("@prisma/client/runtime/library").Decimal;
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
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        };
        message: string;
    }>;
    update(user: AuthUser, id: string, dto: UpdateInstallmentDto): Promise<{
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        }) | null;
        message: string;
    }>;
    pay(user: AuthUser, id: string, dto: PayInstallmentDto): Promise<{
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            coupleId: string | null;
            totalInstallments: number;
            userId: string | null;
            firstReferenceMonth: Date;
        }) | null;
        message: string;
    }>;
    remove(user: AuthUser, id: string, dto: DeleteInstallmentDto): Promise<{
        success: true;
        data: {
            id: string;
        };
        message: string;
    }>;
}
