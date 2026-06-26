import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { InvestmentsModule } from '../investments/investments.module';
import { FinanceContextModule } from '../finance-context/finance-context.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { BankStatementAnalysisService } from './bank-statement-analysis.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule, InvestmentsModule, FinanceContextModule],
  controllers: [InsightsController],
  providers: [InsightsService, BankStatementAnalysisService],
  exports: [InsightsService, BankStatementAnalysisService],
})
export class InsightsModule {}
