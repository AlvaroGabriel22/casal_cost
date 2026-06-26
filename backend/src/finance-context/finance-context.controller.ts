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
import { ok } from '../common/api-response';
import { FinanceContextService } from './finance-context.service';
import {
  AnswerFinanceContextQuestionDto,
  UpsertFinanceContextRuleDto,
} from './dto/finance-context.dto';

@Controller('assistant/finance-context')
@UseGuards(JwtAuthGuard)
export class FinanceContextController {
  constructor(private readonly financeContext: FinanceContextService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.financeContext.getPayload(user.id);
    return ok(data, 'Operation completed successfully');
  }

  @Post('rules')
  async createRule(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertFinanceContextRuleDto,
  ) {
    const data = await this.financeContext.createRule(user.id, dto);
    return ok(data, 'Contexto salvo — a IA usará nas próximas análises');
  }

  @Patch('rules/:id')
  async updateRule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertFinanceContextRuleDto,
  ) {
    const data = await this.financeContext.updateRule(user.id, id, dto);
    return ok(data, 'Contexto atualizado');
  }

  @Delete('rules/:id')
  async deleteRule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.financeContext.deleteRule(user.id, id);
    return ok(data, 'Contexto removido');
  }

  @Post('questions/:id/answer')
  async answerQuestion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AnswerFinanceContextQuestionDto,
  ) {
    const data = await this.financeContext.answerQuestion(user.id, id, dto);
    return ok(data, 'Obrigado — a IA aprendeu com sua resposta');
  }

  @Post('questions/:id/dismiss')
  async dismissQuestion(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.financeContext.dismissQuestion(user.id, id);
    return ok(data, 'Pergunta ignorada');
  }
}
