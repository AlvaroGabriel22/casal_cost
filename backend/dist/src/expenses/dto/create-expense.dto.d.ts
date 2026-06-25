import { ExpenseType, PaymentMethod, RecurrenceFrequency } from '@prisma/client';
declare class RecurrenceDto {
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
    dayOfMonth?: number;
}
declare class InstallmentMetaDto {
    totalInstallments: number;
    firstReferenceMonth: string;
    dueDay?: number;
}
export declare class CreateExpenseDto {
    title: string;
    description?: string;
    category: string;
    totalAmount: number;
    expenseType: ExpenseType;
    paymentMethod: PaymentMethod;
    cardName?: string;
    paidByUserId?: string;
    referenceMonth?: string;
    dueDate?: string;
    recurrence?: RecurrenceDto;
    installment?: InstallmentMetaDto;
}
export declare class UpdateExpenseDto {
    title?: string;
    description?: string;
    category?: string;
    totalAmount?: number;
    paymentMethod?: PaymentMethod;
    cardName?: string;
    paidByUserId?: string;
}
export declare class ExpensePaymentDto {
    occurrenceId?: string;
    referenceMonth?: string;
}
export declare class PayMyShareDto extends ExpensePaymentDto {
    password: string;
}
export declare class ConfirmPasswordDto {
    password: string;
}
export {};
