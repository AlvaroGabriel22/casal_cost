import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { InsightsService } from './insights.service';
import { ok } from '../common/api-response';

@Controller('assistant/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  /**
   * Returns a single payload with every section of the AI assistant screen,
   * computed deterministically from the user's own financial data. No LLM
   * calls are made — every figure can be traced back to a row in the
   * database, which keeps confidence high and token usage at zero.
   */
  @Get('overview')
  async overview(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    const data = await this.insights.buildOverview(user.id, month);
    return ok(data, 'Operation completed successfully');
  }
}
