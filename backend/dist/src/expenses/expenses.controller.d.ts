import type { AuthUser } from '../auth/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { ConfirmPasswordDto, CreateExpenseDto, ExpensePaymentDto, PayMyShareDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { ExpenseListQueryDto, IndividualStatementQueryDto } from './dto/expense-query.dto';
export declare class ExpensesController {
    private readonly expenses;
    private readonly calc;
    constructor(expenses: ExpensesService, calc: FinancialCalculationService);
    private defaultYm;
    create(user: AuthUser, dto: CreateExpenseDto): unknown;
    list(user: AuthUser, query: ExpenseListQueryDto): unknown;
    statement(user: AuthUser, query: IndividualStatementQueryDto): unknown;
    one(user: AuthUser, id: string): unknown;
    update(user: AuthUser, id: string, dto: UpdateExpenseDto): unknown;
    remove(user: AuthUser, id: string, dto: ConfirmPasswordDto): unknown;
    pay(user: AuthUser, id: string, dto: ExpensePaymentDto): unknown;
    payMyShare(user: AuthUser, id: string, dto: PayMyShareDto): unknown;
    cancel(user: AuthUser, id: string, dto: ExpensePaymentDto): unknown;
}
