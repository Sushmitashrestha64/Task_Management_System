import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'I have started working on this fix.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}