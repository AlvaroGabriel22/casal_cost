import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ExpenseScope,
  ExpenseType,
  PaymentMethod,
  RecurrenceFrequency,
} from '@prisma/client';

class RecurrenceDto {
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayOfMonth?: number;
}

class InstallmentMetaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalInstallments: number;

  @IsDateString()
  firstReferenceMonth: string;
}

export class CreateExpenseDto {
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

  @IsEnum(ExpenseType)
  expenseType: ExpenseType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  cardName?: string;

  @IsOptional()
  @IsUUID()
  paidByUserId?: string;

  @IsOptional()
  @IsDateString()
  referenceMonth?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InstallmentMetaDto)
  installment?: InstallmentMetaDto;
}

export class UpdateExpenseDto {
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
}

export class ExpensePaymentDto {
  @IsOptional()
  @IsUUID()
  occurrenceId?: string;

  @IsOptional()
  @IsString()
  referenceMonth?: string;
}

export class PayMyShareDto extends ExpensePaymentDto {
  @IsString()
  password: string;
}

export class ConfirmPasswordDto {
  @IsString()
  password: string;
}
