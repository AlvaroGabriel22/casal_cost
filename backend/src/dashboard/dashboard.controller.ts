import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { FinancialProjectionService } from '../financial/financial-projection.service';
import { PermissionService } from '../permission/permission.service';
import { ok } from '../common/api-response';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly calc: FinancialCalculationService,
    private readonly projection: FinancialProjectionService,
    private readonly permission: PermissionService,
  ) {}

  private defaultYm(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}`;
  }

  @Get('individual')
  async individual(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    const m = month ?? this.defaultYm();
    const dash = await this.calc.calculateIndividualMonth(user.id, m);
    const futureProjection = await this.projection.projectMonths(user.id, 6);
    return ok({ ...dash, futureProjection }, 'Operation completed successfully');
  }

  @Get('couple')
  async couple(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    const couple = await this.permission.getActiveCoupleForUser(user.id);
    if (!couple) {
      return ok(null, 'Operation completed successfully');
    }
    const m = month ?? this.defaultYm();
    const data = await this.calc.calculateCoupleMonth(couple.coupleId, m);
    return ok(data, 'Operation completed successfully');
  }

  @Get('projection')
  async proj(
    @CurrentUser() user: AuthUser,
    @Query('months') months?: string,
  ) {
    const n = months ? parseInt(months, 10) : 6;
    const rows = await this.projection.projectMonths(user.id, n);
    return ok(rows, 'Operation completed successfully');
  }
}
