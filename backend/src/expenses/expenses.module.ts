import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { ExpensesController } from './expenses.controller';
import { CoupleExpensesController } from './couple-expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule],
  controllers: [ExpensesController, CoupleExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
