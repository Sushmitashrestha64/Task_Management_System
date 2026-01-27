import { ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { Repository, ILike } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { ProjectsService } from 'src/projects/projects.service';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { TaskComment } from './entity/comment.entity';
import { CreateCommentDto } from './dto/comment.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityAction } from 'src/activity-log/entity/activity-log.entity';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskAttachment } from './entity/attachment.entity';
import { B2Service } from 'src/b2/b2.service';


@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
        @InjectRepository(TaskComment) private readonly commentRepo: Repository<TaskComment>,
        @InjectRepository(TaskAttachment) private readonly attachmentRepo: Repository<TaskAttachment>,
        @Inject(forwardRef(() => ProjectsService)) private readonly projectsService: ProjectsService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly eventEmitter: EventEmitter2,
        private readonly b2Service: B2Service,
    ) {}

    async createTask(dto: CreateTaskDto, userId: string): Promise<Task> {
       const isMember = await this.projectsService.getMemberRole(dto.projectId, userId);
         if (!isMember) {
            throw new ForbiddenException('You are not a member of this project');
        }
        
        const task = this.taskRepo.create(dto);
        const savedTask = await this.taskRepo.save(task);

        this.eventEmitter.emit('project.activity', {
            projectId: savedTask.projectId,
            userId: userId,
            action: ActivityAction.TASK_CREATED,
            details: `Created task "${savedTask.title}"`,
        });
        
        if (dto.assignedToId) {
        await this.invalidateTaskCache(savedTask.taskId, dto.projectId, dto.assignedToId);
        }
        return savedTask;
    }

    async getTaskById(taskId: string): Promise<Task> {
        const cacheKey = `task_detail:${taskId}`;
        const cachedTask= await this.cacheManager.get<Task>(cacheKey);
        if (cachedTask) {
            return cachedTask;
        }
        const task = await this.taskRepo.findOne({ where: { taskId , isDeleted: false },
        relations: ['project'],
    });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        await this.cacheManager.set(cacheKey, task, 1800);
        return task;
    }

    async updateTask(taskId: string, dto: UpdateTaskDto, operatorId: string): Promise<Task> {
        const task = await this.getTaskById(taskId);
        Object.assign(task, dto);
        const updatedTask = await this.taskRepo.save(task);

        this.eventEmitter.emit('project.activity', {
            projectId: updatedTask.projectId,
            userId:operatorId, 
            action: ActivityAction.TASK_UPDATED,
            details: `Updated task "${updatedTask.title}"`,
        });
        await this.invalidateTaskCache(taskId, task.projectId, task.assignedToId);
        return updatedTask;
    }

    async updateTaskStatus(taskId: string, userId: string, dto:UpdateTaskStatusDto){
        const task = await this.getTaskById(taskId);
        const member = await this.projectsService.getMemberRole(task.projectId, userId);
        if (!member) {
            throw new ForbiddenException('You are not a member of this project');
        }
        const role = member.role;
        const accessibleRoles = [ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER, ProjectRole.LEAD];
        if (accessibleRoles.includes(role) || task.assignedToId === userId) {
            task.status = dto.status;
            const updatedTask = await this.taskRepo.save(task);

            this.eventEmitter.emit('project.activity', {
                projectId: updatedTask.projectId,
                userId: userId,
                action: ActivityAction.TASK_STATUS_UPDATED,
                details: `Updated status of task "${updatedTask.title}" to "${updatedTask.status}"`,
            });

            await this.invalidateTaskCache(taskId, task.projectId, task.assignedToId);
            return updatedTask;
        } else {
            throw new ForbiddenException('You do not have permission to update the task status');
        }
    }

    async deleteTask(taskId: string, operatorId: string): Promise<{ message: string }> {
        const task = await this.getTaskById(taskId);
        task.isDeleted = true;
        task.deletedAt = new Date();

        await this.taskRepo.save(task);

        this.eventEmitter.emit('project.activity', {
            projectId: task.projectId,
            userId: operatorId,
            action: ActivityAction.TASK_DELETED,
            details: `Soft deleted task "${task.title}"`,
        });
        await this.invalidateTaskCache(taskId, task.projectId, task.assignedToId);
        return{ message: 'Task soft-deleted successfully'};
    }

    async getMyTasks(userId: string, pagination: PaginationDto): Promise<any> {
        const { page=1, limit=10 } = pagination;
        const skip = (page - 1) * limit;

        const cacheKey = `user_tasks_assigned:${userId}_p${page}_l${limit}`;
        const cachedTasks= await this.cacheManager.get(cacheKey);
        if (cachedTasks) {
            return cachedTasks;
        }
        const [tasks, total] = await this.taskRepo.findAndCount({ 
            where: { assignedToId: userId , isDeleted: false }, 
            relations: ['project'],
            order: { updatedAt: 'DESC' },
            skip,
            take: limit,
         });
        if(total === 0){
            return {
                data:[],
                message:'No tasks assigned to you.'
            };
        }
        const result = {
            data: tasks,
            meta:{
                total,
                page,
                lastPage: Math.ceil(total/limit),
            },
        };

        await this.cacheManager.set(cacheKey, result, 1800);
        return result;
    }

    async getTaskByTimeframe(projectId: string, startDate?: string, endDate?: string) {
        const query = this.taskRepo.createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedTo', 'user') 
        .where('task.projectId = :projectId', { projectId });

        if (startDate) {
        query.andWhere('task.createdAt >= :startDate', { startDate: new Date(startDate) });
        }

        if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.andWhere('task.createdAt <= :endDate', { endDate: end });
        }

        const tasks = await query.getMany();
        console.log(`[TasksService] Found ${tasks.length} tasks for Project: ${projectId}`);
        return tasks;
  }

  async getProjectTasks(projectId: string, filterDto: TaskFilterDto){
    const { page=1, limit=10, search, status, priority } = filterDto;
    const skip = (page - 1) * limit;
    const cacheKey = `project_tasks:${projectId}:p${page}:l${limit}:search_${search || 'none'}:status_${status || 'all'}:priority_${priority || 'all'}`;
    const cachedData= await this.cacheManager.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    const query = this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedTo', 'user')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
        query.andWhere('task.title ILike :search', { search: `%${search}%` });
    }
    if (status) {
        query.andWhere('task.status = :status', { status });
    }
    if (priority) {
        query.andWhere('task.priority = :priority', { priority });
    }
    const [tasks, total] = await query
        .orderBy('task.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    const result = {
        data: tasks,
        meta:{
            total,
            page,
            lastPage: Math.ceil(total/limit),
        },
    };
    await this.cacheManager.set(cacheKey, result, 1800);
    return result;
  }

  async addComment(taskId: string, userId:string, dto: CreateCommentDto) {
    const task = await this.getTaskById(taskId);
    const comment = this.commentRepo.create({
        content: dto.content,
        taskId: task.taskId,
        authorId: userId,
    });
    const savedComment = await this.commentRepo.save(comment);

    this.eventEmitter.emit('project.activity', {
        projectId: task.projectId,
        userId: userId,
        action: ActivityAction.COMMENT_ADDED,
        details: `Added comment to task "${task.title}"`,
    });
    await this.cacheManager.del(`task_comments:${taskId}`);
    return savedComment;
  }

  async getTaskComments(taskId: string){
    const comment = await this.commentRepo.find({
        where: { taskId },
        relations: ['author'],
        order: { createdAt: 'ASC' },
    });
    return comment;
  }

  async deleteComment(commentId: string, userId: string){
    const comment = await this.commentRepo.findOne({
        where: { commentId },
        relations: ['task'],
        });
    if(!comment){
        throw new NotFoundException('Comment not found');
    }
    if(comment.authorId !== userId){
        throw new ForbiddenException('You can only delete your own comments');
    }
    const taskId = comment.taskId;
    const projectId = comment.task.projectId;
    await this.commentRepo.remove(comment);
    
    this.eventEmitter.emit('project.activity', {
        projectId: projectId,
        userId: userId,
        action: ActivityAction.COMMENT_DELETED,
        details: `Deleted comment from task "${comment.task.title}"`,
    });

    await this.cacheManager.del(`task_comments:${comment.taskId}`);
    return { message: 'Comment deleted successfully' };
  }

  async uploadAttachment(taskId: string, userId: string, file: Express.Multer.File){
    const task = await this.getTaskById(taskId);
    const cloudPath = `attachments/${taskId}/${Date.now()}_${file.originalname}`;
    const uploadResult = await this.b2Service.uploadBuffer(
        file.buffer, 
        cloudPath, 
        file.mimetype
    );
 
    const downloadUrl = await this.b2Service.getDownloadUrl(uploadResult.fileName);
    const attachment = this.attachmentRepo.create({
        fileName: file.originalname,
        fileUrl: downloadUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        taskId: task.taskId,
        uploaderId: userId,
    });
 
    const savedAttachment = await this.attachmentRepo.save(attachment);     
    this.eventEmitter.emit('project.activity', {
        projectId: task.projectId,
        userId: userId,
        action: ActivityAction.TASK_UPDATED,
        details: `Uploaded attachment to task "${task.title}"`,
    });
    await this.invalidateTaskCache(taskId, task.projectId, task.assignedToId);
    return savedAttachment;
  }

  async getTaskAttachments(taskId: string){
    const attachments = await this.attachmentRepo.find({
        where: { taskId }
    });
    return attachments;
  }
  
  private async invalidateTaskCache(taskId: string, projectId: string, userId?: string) {
    await this.cacheManager.del(`task_detail:${taskId}`);
    const defaultProjectKey = `project_tasks:${projectId}:p1:l10:search_none:status_all:priority_all`;
    await this.cacheManager.del(defaultProjectKey);
        if (userId) {
            await this.cacheManager.del(`user_tasks_assigned:${userId}_p1_l10`);
        }
   }

}
