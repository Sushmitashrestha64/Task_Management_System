import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { User } from 'src/common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateCommentDto } from './dto/comment.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,  FileValidator } from '@nestjs/common';


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
  async updateTask(@Param('taskId') taskId: string, @Body() dto: UpdateTaskDto,@User('userId') operatorId: string) {
    return this.tasksService.updateTask(taskId, dto, operatorId);
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
  async deleteTask(@Param('taskId') taskId: string, @User('userId') operatorId: string) {
    return this.tasksService.deleteTask(taskId, operatorId);
  }

  @Auth()
  @Get('my-tasks')
  @ApiOperation({ summary: 'Get my tasks' })
  async getMyTasks(
    @User('userId') userId: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.tasksService.getMyTasks(userId, paginationDto);
  }

  @Auth()
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Search and Filter tasks within a project' })
  async getProjectTasks(
    @Param('projectId') projectId: string,
    @Query() filterDto: TaskFilterDto,
  ) {
    return this.tasksService.getProjectTasks(projectId, filterDto);
  }

  @Auth()
  @Post(':taskId/comments')
  @ApiOperation({ summary: 'Add comment to a task' })
  async addComment(
    @Param('taskId') taskId: string,
    @User('userId') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.addComment(taskId, userId, dto);
  }

  @Auth()
  @Get(':taskId/comments')
  @ApiOperation({ summary: 'Get comments for a task' })
  async getTaskComments(@Param('taskId') taskId: string) {
    return this.tasksService.getTaskComments(taskId);
  }

  @Auth()
  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete your own comment' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @User('userId') userId: string,
  ) {
    return this.tasksService.deleteComment(commentId, userId);
  }

  @Auth(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD, ProjectRole.MEMBER)
  @Post(':taskId/upload')
  @ApiOperation({ summary: 'Upload an attachment to a task' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('taskId') taskId: string,
    @User('userId') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 15 }), 
          new (class extends FileValidator<any> {
            constructor() {
              super({});
            }
            async isValid(file: any): Promise<boolean> {
              if (!file || !file.mimetype) return false;
              const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png','application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              ];
              return allowedTypes.includes(file.mimetype);
            }
            buildErrorMessage(): string {
              return 'Invalid file type. Allowed types are JPEG, JPG, PNG, PDF, DOCX and XLSX.';
            }
          })(),
        ],
      }),
    ) file: Express.Multer.File,
  ) {
    return this.tasksService.uploadAttachment(taskId, userId, file);
  }

  @Auth()
  @Get(':taskId/attachments')
  @ApiOperation({ summary: 'Get all attachments for a task' })
  async getAttachments(@Param('taskId') taskId: string) {
    return this.tasksService.getTaskAttachments(taskId);
  }
}