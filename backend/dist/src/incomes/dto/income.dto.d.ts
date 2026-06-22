import { IncomeType } from '@prisma/client';
export declare class CreateIncomeDto {
    type: IncomeType;
    description?: string;
    amount: number;
    referenceMonth: string;
    receivedDate?: string;
    isRecurring?: boolean;
    recurrenceStartDate?: string;
    recurrenceEndDate?: string;
}
export declare class UpdateIncomeDto {
    type?: IncomeType;
    description?: string;
    amount?: number;
    referenceMonth?: string;
}
