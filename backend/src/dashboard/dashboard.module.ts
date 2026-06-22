import { Module } from '@nestjs/common';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [FinancialDomainModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
