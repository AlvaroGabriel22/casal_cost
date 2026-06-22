import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule],
  controllers: [CouplesController],
  providers: [CouplesService],
})
export class CouplesModule {}
