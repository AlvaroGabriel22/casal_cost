import { DetectedBank } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class StatementImportQueryDto {
  @IsOptional()
  month?: string;

  @IsOptional()
  @IsEnum(DetectedBank)
  bank?: DetectedBank;
}

export class StatementBankHintDto {
  @IsOptional()
  @IsEnum(DetectedBank)
  bank?: DetectedBank;
}
