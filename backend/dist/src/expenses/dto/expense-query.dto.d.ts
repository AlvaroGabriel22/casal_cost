import { ExpenseScope, ExpenseStatus, ExpenseType, PaymentMethod } from '@prisma/client';
export declare class ExpenseListQueryDto {
    month?: string;
    status?: ExpenseStatus;
    category?: string;
    scope?: ExpenseScope;
    paymentMethod?: PaymentMethod;
    expenseType?: ExpenseType;
    page?: number;
    limit?: number;
}
export declare class IndividualStatementQueryDto {
    month?: string;
    name?: string;
    source?: 'ALL' | 'INDIVIDUAL' | 'SHARED';
}
