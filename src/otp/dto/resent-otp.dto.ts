import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Email address to resend OTP to' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}