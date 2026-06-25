import { ExpenseScope, PaymentMethod } from '@prisma/client';
import { ConfirmPasswordDto } from '../../expenses/dto/create-expense.dto';
export declare class CreateInstallmentDto {
    title: string;
    description?: string;
    category: string;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    cardName?: string;
    paidByUserId?: string;
    totalInstallments: number;
    firstReferenceMonth: string;
    dueDay?: number;
    scope: ExpenseScope;
}
export declare class UpdateInstallmentDto {
    title?: string;
    description?: string;
    category?: string;
    totalAmount?: number;
    paymentMethod?: PaymentMethod;
    cardName?: string;
    paidByUserId?: string;
    totalInstallments?: number;
}
export declare class PayInstallmentDto {
    occurrenceIds?: string[];
}
export declare class DeleteInstallmentDto extends ConfirmPasswordDto {
}
