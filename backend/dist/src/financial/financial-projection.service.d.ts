import { FinancialCalculationService } from './financial-calculation.service';
export declare class FinancialProjectionService {
    private readonly calc;
    constructor(calc: FinancialCalculationService);
    projectMonths(userId: string, months: number): Promise<{
        month: string;
        income: string;
        individualExpenses: string;
        sharedExpensesResponsibility: string;
        totalExpenses: string;
        balance: string;
        status: string;
    }[]>;
}
