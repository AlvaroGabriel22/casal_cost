import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { OccurrenceGenerationService } from '../financial/occurrence-generation.service';
import { AuditLogService } from '../audit/audit-log.service';
import type { CreateExpenseDto, ConfirmPasswordDto, ExpensePaymentDto, PayMyShareDto, UpdateExpenseDto } from './dto/create-expense.dto';
import type { ExpenseListQueryDto } from './dto/expense-query.dto';
export declare class ExpensesService {
    private readonly prisma;
    private readonly permission;
    private readonly occurrences;
    private readonly audit;
    constructor(prisma: PrismaService, permission: PermissionService, occurrences: OccurrenceGenerationService, audit: AuditLogService);
    private monthStartFromYm;
    private defaultYm;
    private assertCoupleMember;
    createIndividual(userId: string, dto: CreateExpenseDto): Promise<{
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
    createShared(userId: string, dto: CreateExpenseDto): Promise<{
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
    list(userId: string, query: ExpenseListQueryDto): Promise<{
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
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        message: string;
    }>;
    listShared(userId: string, query: ExpenseListQueryDto): Promise<{
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
                    amount: Prisma.Decimal;
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
                    percentage: Prisma.Decimal | null;
                    fixedAmount: Prisma.Decimal | null;
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
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        message: string;
    }>;
    getOne(userId: string, id: string): Promise<{
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
                totalAmount: Prisma.Decimal;
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
                amount: Prisma.Decimal;
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
                percentage: Prisma.Decimal | null;
                fixedAmount: Prisma.Decimal | null;
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
        };
        message: string;
    }>;
    updateOne(userId: string, id: string, dto: UpdateExpenseDto): Promise<{
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
    assertPassword(userId: string, password?: string): Promise<void>;
    softDelete(userId: string, id: string, dto?: ConfirmPasswordDto): Promise<{
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
    private monthStartFromMaybeDate;
    private syncExpenseStatus;
    private occurrenceWhereForAction;
    pay(userId: string, id: string, dto?: ExpensePaymentDto): Promise<{
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
        }) | null;
        message: string;
    }>;
    payMyShare(userId: string, id: string, dto: PayMyShareDto): Promise<{
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
    cancel(userId: string, id: string, dto?: ExpensePaymentDto): Promise<{
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
        }) | null;
        message: string;
    }>;
}
