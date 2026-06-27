import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { ok } from '../common/api-response';
import { StatementImportsService } from './statement-imports.service';
import { StatementReconciliationService } from './statement-reconciliation.service';
import {
  DeleteStatementImportDto,
  StatementBankHintDto,
  StatementImportQueryDto,
} from './dto/statement-import.dto';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};

const uploadOptions = { limits: { fileSize: 5 * 1024 * 1024 } };

@Controller('statement-imports')
@UseGuards(JwtAuthGuard)
export class StatementImportsController {
  constructor(
    private readonly imports: StatementImportsService,
    private readonly reconciliation: StatementReconciliationService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.imports.listImports(user.id);
  }

  @Get('entries')
  entries(@CurrentUser() user: AuthUser, @Query() query: StatementImportQueryDto) {
    return this.imports.listEntries(user.id, query.month, query.bank, query.sourceType);
  }

  @Get('reconciliation')
  async reconciliationOverview(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Informe o mês no formato YYYY-MM.');
    }
    const overview = await this.reconciliation.getOverview(user.id, month);
    return ok(overview, 'Operation completed successfully');
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  preview(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedFile,
    @Query() query: StatementBankHintDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Selecione um arquivo CSV ou OFX.');
    }
    return this.imports.preview(user.id, file.buffer, file.originalname, query.bank, query.sourceType);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  import(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedFile,
    @Query() query: StatementBankHintDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Selecione um arquivo CSV ou OFX.');
    }
    return this.imports.import(user.id, file.buffer, file.originalname, query.bank, query.sourceType);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeleteStatementImportDto,
  ) {
    return this.imports.deleteImport(user.id, id, dto.password);
  }
}
