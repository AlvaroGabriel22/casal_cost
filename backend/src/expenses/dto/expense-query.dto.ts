import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ExpenseScope,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class ExpenseListQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ExpenseScope)
  scope?: ExpenseScope;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class IndividualStatementQueryDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['ALL', 'INDIVIDUAL', 'SHARED'])
  source?: 'ALL' | 'INDIVIDUAL' | 'SHARED';
}
