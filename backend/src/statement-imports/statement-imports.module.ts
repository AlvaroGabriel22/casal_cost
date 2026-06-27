import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogService } from '../audit/audit-log.service';
import { StatementImportsController } from './statement-imports.controller';
import { StatementImportsService } from './statement-imports.service';
import { StatementReconciliationService } from './statement-reconciliation.service';
import { StatementConsolidationService } from './statement-consolidation.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StatementImportsController],
  providers: [
    AuditLogService,
    StatementImportsService,
    StatementReconciliationService,
    StatementConsolidationService,
  ],
  exports: [
    StatementImportsService,
    StatementReconciliationService,
    StatementConsolidationService,
  ],
})
export class StatementImportsModule {}
