import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { AiModule } from '../ai/ai.module';
import { InsightsModule } from '../insights/insights.module';
import { FinanceContextModule } from '../finance-context/finance-context.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { FinanceRagService } from './finance-rag.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule, AiModule, InsightsModule, FinanceContextModule],
  controllers: [ChatController],
  providers: [ChatService, FinanceRagService],
  exports: [ChatService, FinanceRagService],
})
export class ChatModule {}
