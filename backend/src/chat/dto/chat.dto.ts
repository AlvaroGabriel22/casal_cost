import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatAskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
