import type { AuthUser } from '../auth/current-user.decorator';
import { ExpensesService } from '../expenses/expenses.service';
import { ConfirmPasswordDto, CreateExpenseDto, ExpensePaymentDto, UpdateExpenseDto } from '../expenses/dto/create-expense.dto';
import { ExpenseListQueryDto } from '../expenses/dto/expense-query.dto';
export declare class CoupleExpensesController {
    private readonly expenses;
    constructor(expenses: ExpensesService);
    create(user: AuthUser, dto: CreateExpenseDto): unknown;
    list(user: AuthUser, query: ExpenseListQueryDto): unknown;
    update(user: AuthUser, id: string, dto: UpdateExpenseDto): unknown;
    pay(user: AuthUser, id: string, dto: ExpensePaymentDto): unknown;
    cancel(user: AuthUser, id: string, dto: ExpensePaymentDto): unknown;
    remove(user: AuthUser, id: string, dto: ConfirmPasswordDto): unknown;
}
