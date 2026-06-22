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
import { IndividualAccessService } from './individual-access.service';
import { CreateAccessDto, UpdateAccessDto } from './dto/access.dto';

@Controller('individual-access')
@UseGuards(JwtAuthGuard)
export class IndividualAccessController {
  constructor(private readonly access: IndividualAccessService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccessDto) {
    return this.access.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccessDto,
  ) {
    return this.access.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.access.remove(user.id, id);
  }

  @Get('me')
  list(@CurrentUser() user: AuthUser) {
    return this.access.listForMe(user.id);
  }
}
