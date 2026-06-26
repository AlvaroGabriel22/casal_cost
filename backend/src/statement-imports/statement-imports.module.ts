import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatementImportsController } from './statement-imports.controller';
import { StatementImportsService } from './statement-imports.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatementImportsController],
  providers: [StatementImportsService],
  exports: [StatementImportsService],
})
export class StatementImportsModule {}
