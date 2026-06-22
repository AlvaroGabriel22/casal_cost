import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IncomeType } from '@prisma/client';

export class CreateIncomeDto {
  @IsEnum(IncomeType)
  type: IncomeType;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  /** First day of month YYYY-MM or ISO date */
  @IsDateString()
  referenceMonth: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  recurrenceStartDate?: string;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;
}

export class UpdateIncomeDto {
  @IsOptional()
  @IsEnum(IncomeType)
  type?: IncomeType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  referenceMonth?: string;
}
