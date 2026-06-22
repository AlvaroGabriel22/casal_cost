import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule],
  controllers: [IncomesController],
  providers: [IncomesService],
})
export class IncomesModule {}
