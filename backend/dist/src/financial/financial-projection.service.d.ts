import { FinancialCalculationService } from './financial-calculation.service';
export declare class FinancialProjectionService {
    private readonly calc;
    constructor(calc: FinancialCalculationService);
    projectMonths(userId: string, months: number): unknown;
}
