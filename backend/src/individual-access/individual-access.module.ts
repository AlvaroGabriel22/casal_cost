import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { IndividualAccessController } from './individual-access.controller';
import { IndividualAccessService } from './individual-access.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule],
  controllers: [IndividualAccessController],
  providers: [IndividualAccessService],
})
export class IndividualAccessModule {}
