import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceContextController } from './finance-context.controller';
import { FinanceContextService } from './finance-context.service';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceContextController],
  providers: [FinanceContextService],
  exports: [FinanceContextService],
})
export class FinanceContextModule {}
