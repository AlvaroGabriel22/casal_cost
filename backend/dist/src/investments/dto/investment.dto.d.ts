import { InvestmentScope } from '@prisma/client';
export declare class CreateInvestmentDto {
    scope: InvestmentScope;
    amount: number;
    referenceMonth: string;
    contributedAt?: string;
    description?: string;
}
export declare class UpdateInvestmentDto {
    amount?: number;
    referenceMonth?: string;
    contributedAt?: string;
    description?: string;
}
export declare class InvestmentQueryDto {
    scope?: InvestmentScope;
    month?: string;
}
