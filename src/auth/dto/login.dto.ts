import { ApiProperty } from '@nestjs/swagger';
import {IsEmail, IsString, MinLength} from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'krish@example.com', description: 'Unique email address' })
    @IsEmail({}, { message: 'Please enter a valid email address' })
    email: string;
  
    @ApiProperty({ example: 'password123', description: 'Password (min 6 characters)' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;
}
