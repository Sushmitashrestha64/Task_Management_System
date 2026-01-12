import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { User } from 'src/common/decorators/user.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async createTask(@Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto);
  }

  @Patch(':taskId')
  async updateTask(@Param('taskId') taskId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.updateTask(taskId, dto);
  }

  @Patch(':taskId/status')
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @User('userId') userId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateTaskStatus(taskId, userId, dto);
  }

  @Delete(':taskId')
  async deleteTask(@Param('taskId') taskId: string) {
    return this.tasksService.deleteTask(taskId);
  }
}