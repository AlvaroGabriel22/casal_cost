import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InvestmentScope } from '@prisma/client';

export class CreateInvestmentDto {
  @IsEnum(InvestmentScope)
  scope!: InvestmentScope;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  /** YYYY-MM or YYYY-MM-DD */
  @IsString()
  referenceMonth!: string;

  @IsOptional()
  @IsDateString()
  contributedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateInvestmentDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  referenceMonth?: string;

  @IsOptional()
  @IsDateString()
  contributedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class InvestmentQueryDto {
  @IsOptional()
  @IsEnum(InvestmentScope)
  scope?: InvestmentScope;

  @IsOptional()
  @IsString()
  month?: string;
}
