import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialDomainModule } from '../financial/financial-domain.module';
import { AiModule } from '../ai/ai.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { FinanceRagService } from './finance-rag.service';

@Module({
  imports: [PrismaModule, FinancialDomainModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService, FinanceRagService],
  exports: [ChatService, FinanceRagService],
})
export class ChatModule {}
