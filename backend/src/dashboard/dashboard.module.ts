import { Module } from '@nestjs/common';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { InvestmentsModule } from '../investments/investments.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [FinancialDomainModule, InvestmentsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
