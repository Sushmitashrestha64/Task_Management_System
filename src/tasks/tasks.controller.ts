import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { User } from 'src/common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ProjectRole } from 'src/projects/entity/project-member.entity';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Auth(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD)
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async createTask(@User('userId') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto,userId);
  }

  @Auth(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD, ProjectRole.MEMBER)
  @Patch(':taskId')
  @ApiOperation({ summary: 'Update task details' })
  async updateTask(@Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(taskId, dto);
  }

  @Auth(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD, ProjectRole.MEMBER)
  @Patch(':taskId/status')
  @ApiOperation({ summary: 'Update status (Only if you are the Assigned User)' })
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @User('userId') userId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    console.log('Updating task status:', { taskId, userId, dto });
    return this.tasksService.updateTaskStatus(taskId, userId, dto);
  }

  @Auth(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD)
  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete task' })
  async deleteTask(@Param('taskId') taskId: string) {
    return this.tasksService.deleteTask(taskId);
  }
}