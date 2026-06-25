import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { InvestmentsService } from './investments.service';
import {
  CreateInvestmentDto,
  InvestmentQueryDto,
  UpdateInvestmentDto,
} from './dto/investment.dto';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly investments: InvestmentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto) {
    return this.investments.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: InvestmentQueryDto) {
    return this.investments.list(user.id, q.scope, q.month);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.investments.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investments.remove(user.id, id);
  }
}
