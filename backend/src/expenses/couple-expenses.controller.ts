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
import { ExpensesService } from '../expenses/expenses.service';
import {
  ConfirmPasswordDto,
  CreateExpenseDto,
  ExpensePaymentDto,
  UpdateExpenseDto,
} from '../expenses/dto/create-expense.dto';
import { ExpenseListQueryDto } from '../expenses/dto/expense-query.dto';

@Controller('couple/expenses')
@UseGuards(JwtAuthGuard)
export class CoupleExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.createShared(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ExpenseListQueryDto) {
    return this.expenses.listShared(user.id, query);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.updateOne(user.id, id, dto);
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExpensePaymentDto,
  ) {
    return this.expenses.pay(user.id, id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExpensePaymentDto,
  ) {
    return this.expenses.cancel(user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConfirmPasswordDto,
  ) {
    return this.expenses.softDelete(user.id, id, dto);
  }
}
