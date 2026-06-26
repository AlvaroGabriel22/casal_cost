import {
  BadRequestException,
  Controller,
  Get,
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
import { StatementImportsService } from './statement-imports.service';
import {
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
  constructor(private readonly imports: StatementImportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.imports.listImports(user.id);
  }

  @Get('entries')
  entries(@CurrentUser() user: AuthUser, @Query() query: StatementImportQueryDto) {
    return this.imports.listEntries(user.id, query.month, query.bank);
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
    return this.imports.preview(user.id, file.buffer, file.originalname, query.bank);
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
    return this.imports.import(user.id, file.buffer, file.originalname, query.bank);
  }
}
