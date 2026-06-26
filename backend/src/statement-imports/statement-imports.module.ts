import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { AuthModule } from '../auth/auth.module';
import { StatementImportsController } from './statement-imports.controller';
import { StatementImportsService } from './statement-imports.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule, AuthModule],
  controllers: [StatementImportsController],
  providers: [StatementImportsService],
  exports: [StatementImportsService],
})
export class StatementImportsModule {}
