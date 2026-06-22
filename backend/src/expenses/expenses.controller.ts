import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import {
  ConfirmPasswordDto,
  CreateExpenseDto,
  ExpensePaymentDto,
  PayMyShareDto,
  UpdateExpenseDto,
} from './dto/create-expense.dto';
import {
  ExpenseListQueryDto,
  IndividualStatementQueryDto,
} from './dto/expense-query.dto';
import { ok } from '../common/api-response';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesService,
    private readonly calc: FinancialCalculationService,
  ) {}

  private defaultYm(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`;
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.createIndividual(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ExpenseListQueryDto) {
    return this.expenses.list(user.id, query);
  }

  @Get('statement/individual')
  async statement(
    @CurrentUser() user: AuthUser,
    @Query() query: IndividualStatementQueryDto,
  ) {
    const data = await this.calc.getIndividualStatement(user.id, {
      monthYm: query.month ?? this.defaultYm(),
      name: query.name,
      source: query.source,
    });
    return ok(data, 'Operation completed successfully');
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.getOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.updateOne(user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConfirmPasswordDto,
  ) {
    return this.expenses.softDelete(user.id, id, dto);
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExpensePaymentDto,
  ) {
    return this.expenses.pay(user.id, id, dto);
  }

  @Patch(':id/pay-my-share')
  payMyShare(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PayMyShareDto,
  ) {
    return this.expenses.payMyShare(user.id, id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExpensePaymentDto,
  ) {
    return this.expenses.cancel(user.id, id, dto);
  }
}
