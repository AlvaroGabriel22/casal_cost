import { Injectable } from '@nestjs/common';
import { FinancialCalculationService } from './financial-calculation.service';

@Injectable()
export class FinancialProjectionService {
  constructor(private readonly calc: FinancialCalculationService) {}

  async projectMonths(userId: string, months: number) {
    const n = Math.min(Math.max(months, 1), 36);
    const start = new Date();
    const y = start.getUTCFullYear();
    const m = start.getUTCMonth() + 1;
    const pad = (x: number) => String(x).padStart(2, '0');
    const rows: Array<{
      month: string;
      income: string;
      individualExpenses: string;
      sharedExpensesResponsibility: string;
      totalExpenses: string;
      balance: string;
      status: string;
    }> = [];

    for (let i = 0; i < n; i++) {
      const dt = new Date(Date.UTC(y, m - 1 + i, 1));
      const ym = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
      const dash = await this.calc.calculateIndividualMonth(userId, ym);
      rows.push({
        month: ym,
        income: dash.totalIncomeMonth,
        individualExpenses: dash.totalIndividualExpensesMonth,
        sharedExpensesResponsibility:
          dash.totalSharedExpensesResponsibilityMonth,
        totalExpenses: dash.totalExpensesMonth,
        balance: dash.balanceMonth,
        status: dash.status,
      });
    }

    return rows;
  }
}
