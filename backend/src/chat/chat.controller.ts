import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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

  @Post('stream')
  async stream(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChatAskDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const chunk of this.chat.askStream(user.id, dto.message)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao gerar resposta.';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('reindex')
  reindex(@CurrentUser() user: AuthUser) {
    return this.chat.reindex(user.id);
  }
}
