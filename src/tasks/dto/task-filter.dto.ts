import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger'; // Make sure this is imported
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { TaskStatus, TaskPriority } from '../entity/task.entity';

export class TaskFilterDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Search tasks by title (partial match)',
    example: 'Bug' 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    enum: TaskStatus, 
    description: 'Filter by task status',
    example: TaskStatus.TODO 
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ 
    enum: TaskPriority, 
    description: 'Filter by task priority',
    example: TaskPriority.HIGH 
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}