import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CouplesService } from './couples.service';
import { InvitePartnerDto } from './dto/couple.dto';

@Controller('couples')
@UseGuards(JwtAuthGuard)
export class CouplesController {
  constructor(private readonly couples: CouplesService) {}

  @Post('invite')
  invite(@CurrentUser() user: AuthUser, @Body() dto: InvitePartnerDto) {
    return this.couples.invite(user.id, dto.partnerUsername);
  }

  @Post('accept')
  accept(@CurrentUser() user: AuthUser) {
    return this.couples.accept(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.couples.me(user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.couples.disable(user.id, id);
  }
}
