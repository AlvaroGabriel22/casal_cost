import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateAccessDto {
  @IsUUID()
  allowedUserId: string;

  @IsBoolean()
  canView: boolean;

  @IsBoolean()
  canEdit: boolean;
}

export class UpdateAccessDto {
  @IsOptional()
  @IsBoolean()
  canView?: boolean;

  @IsOptional()
  @IsBoolean()
  canEdit?: boolean;
}
