import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, Severity } from '../entity/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Fix Login Bug' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Users cannot log in', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  @IsEnum(TaskPriority)
  @IsNotEmpty()
  priority: TaskPriority;

  @ApiProperty({ enum: Severity, example: Severity.MAJOR })
  @IsEnum(Severity)
  @IsNotEmpty()
  severity: Severity;

  @ApiProperty({ required: false, example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @ApiProperty({ description: 'The project ID this task belongs to' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'The user ID this task is assigned to', required: false })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status: TaskStatus;
}