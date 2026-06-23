import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CardsService } from './cards.service';
import { UpdateCardDto, UpsertCardDto } from './dto/card.dto';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.cards.list(user.id);
  }

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertCardDto) {
    return this.cards.upsert(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cards.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cards.remove(user.id, id);
  }
}
