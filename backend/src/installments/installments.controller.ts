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
import { InstallmentsService } from './installments.service';
import {
  CreateInstallmentDto,
  DeleteInstallmentDto,
  PayInstallmentDto,
  UpdateInstallmentDto,
} from './dto/installment.dto';

@Controller('installments')
@UseGuards(JwtAuthGuard)
export class InstallmentsController {
  constructor(private readonly installments: InstallmentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInstallmentDto) {
    return this.installments.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.installments.list(user.id);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.installments.one(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInstallmentDto,
  ) {
    return this.installments.update(user.id, id, dto);
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PayInstallmentDto,
  ) {
    return this.installments.pay(user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeleteInstallmentDto,
  ) {
    return this.installments.remove(user.id, id, dto);
  }
}
