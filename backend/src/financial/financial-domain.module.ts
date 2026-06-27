import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatementImportsModule } from '../statement-imports/statement-imports.module';
import { PermissionService } from '../permission/permission.service';
import { AuditLogService } from '../audit/audit-log.service';
import { FinancialCalculationService } from './financial-calculation.service';
import { FinancialProjectionService } from './financial-projection.service';
import { OccurrenceGenerationService } from './occurrence-generation.service';

@Module({
  imports: [PrismaModule, StatementImportsModule],
  providers: [
    PermissionService,
    AuditLogService,
    FinancialCalculationService,
    FinancialProjectionService,
    OccurrenceGenerationService,
  ],
  exports: [
    PermissionService,
    AuditLogService,
    FinancialCalculationService,
    FinancialProjectionService,
    OccurrenceGenerationService,
  ],
})
export class FinancialDomainModule {}
