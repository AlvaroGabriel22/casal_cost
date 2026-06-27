import { DetectedBank, StatementSourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class StatementImportQueryDto {
  @IsOptional()
  month?: string;

  @IsOptional()
  @IsEnum(DetectedBank)
  bank?: DetectedBank;

  @IsOptional()
  @IsEnum(StatementSourceType)
  sourceType?: StatementSourceType;
}

export class StatementBankHintDto {
  @IsOptional()
  @IsEnum(DetectedBank)
  bank?: DetectedBank;

  @IsOptional()
  @IsEnum(StatementSourceType)
  sourceType?: StatementSourceType;
}

export class DeleteStatementImportDto {
  @IsString()
  @MinLength(8)
  password: string;
}
