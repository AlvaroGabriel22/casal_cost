import { IsString, MinLength } from 'class-validator';

export class InvitePartnerDto {
  @IsString()
  @MinLength(2)
  partnerUsername: string;
}
