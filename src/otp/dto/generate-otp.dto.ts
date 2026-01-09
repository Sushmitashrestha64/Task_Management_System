import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateOtpDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Email address to send OTP to' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}