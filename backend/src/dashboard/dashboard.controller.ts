import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InvestmentScope } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { FinancialCalculationService } from '../financial/financial-calculation.service';
import { FinancialProjectionService } from '../financial/financial-projection.service';
import { PermissionService } from '../permission/permission.service';
import { InvestmentsService } from '../investments/investments.service';
import { ok } from '../common/api-response';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly calc: FinancialCalculationService,
    private readonly projection: FinancialProjectionService,
    private readonly permission: PermissionService,
    private readonly investments: InvestmentsService,
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
    const [dash, futureProjection, investmentSummary] = await Promise.all([
      this.calc.calculateIndividualMonth(user.id, m),
      this.projection.projectMonths(user.id, 6),
      this.investments.summarizeScope(user.id, InvestmentScope.INDIVIDUAL, m),
    ]);
    return ok(
      { ...dash, futureProjection, investmentSummary },
      'Operation completed successfully',
    );
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
    const [data, investmentSummary] = await Promise.all([
      this.calc.calculateCoupleMonth(couple.coupleId, m),
      this.investments.summarizeScope(user.id, InvestmentScope.COUPLE, m),
    ]);
    return ok({ ...data, investmentSummary }, 'Operation completed successfully');
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
