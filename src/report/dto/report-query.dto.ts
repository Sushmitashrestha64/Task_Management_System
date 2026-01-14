import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiProperty({ required: false, example: '2023-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, example: '2023-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}