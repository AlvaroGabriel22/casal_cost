import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExpenseScope, ExpenseType, PaymentMethod } from '@prisma/client';
import { ConfirmPasswordDto } from '../../expenses/dto/create-expense.dto';

export class CreateInstallmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  cardName?: string;

  @IsOptional()
  @IsUUID()
  paidByUserId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalInstallments: number;

  @IsDateString()
  firstReferenceMonth: string;

  @IsEnum(ExpenseScope)
  scope: ExpenseScope;
}

export class UpdateInstallmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  cardName?: string;

  @IsOptional()
  @IsUUID()
  paidByUserId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalInstallments?: number;
}

export class PayInstallmentDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  occurrenceIds?: string[];
}

export class DeleteInstallmentDto extends ConfirmPasswordDto {}
