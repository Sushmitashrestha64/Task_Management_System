import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { User } from 'src/common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD)
  @UseGuards(RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async createTask(@User('userId') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto,userId);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD)
  @UseGuards(RolesGuard)
  @Patch(':taskId')
  @ApiOperation({ summary: 'Update task details' })
  async updateTask(@Param('taskId') taskId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.updateTask(taskId, dto);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD, ProjectRole.MEMBER)
  @UseGuards(RolesGuard)
  @Patch(':taskId/status')
  @ApiOperation({ summary: 'Update status (Only if you are the Assigned User)' })
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @User('userId') userId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateTaskStatus(taskId, userId, dto);
  }

    @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD)
  @UseGuards(RolesGuard)
  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete task' })
  async deleteTask(@Param('taskId') taskId: string) {
    return this.tasksService.deleteTask(taskId);
  }
}