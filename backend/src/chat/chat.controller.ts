import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatAskDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.chat.history(user.id);
  }

  @Post()
  ask(@CurrentUser() user: AuthUser, @Body() dto: ChatAskDto) {
    return this.chat.ask(user.id, dto.message);
  }

  @Post('reindex')
  reindex(@CurrentUser() user: AuthUser) {
    return this.chat.reindex(user.id);
  }
}
