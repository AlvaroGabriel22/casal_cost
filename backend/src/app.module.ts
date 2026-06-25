import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FinancialDomainModule } from './financial/financial-domain.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CouplesModule } from './couples/couples.module';
import { IndividualAccessModule } from './individual-access/individual-access.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomesModule } from './incomes/incomes.module';
import { InstallmentsModule } from './installments/installments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CardsModule } from './cards/cards.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FinancialDomainModule,
    AuthModule,
    UsersModule,
    CouplesModule,
    IndividualAccessModule,
    ExpensesModule,
    IncomesModule,
    InstallmentsModule,
    DashboardModule,
    CardsModule,
    ChatModule,
  ],
})
export class AppModule {}
