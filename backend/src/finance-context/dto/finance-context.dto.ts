import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertFinanceContextRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayLabel!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  motive!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}

export class AnswerFinanceContextQuestionDto extends UpsertFinanceContextRuleDto {}
