import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
