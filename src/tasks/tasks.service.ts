import { ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { ProjectsService } from 'src/projects/projects.service';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PaginationDto } from 'src/common/dto/pagination.dto';


@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
        @Inject(forwardRef(() => ProjectsService)) private readonly projectsService: ProjectsService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    async createTask(dto: CreateTaskDto, userId: string): Promise<Task> {
       const isMember = await this.projectsService.getMemberRole(dto.projectId, userId);
         if (!isMember) {
            throw new ForbiddenException('You are not a member of this project');
        }
        
        const task = this.taskRepo.create(dto);
        const savedTask = await this.taskRepo.save(task);
        if (dto.assignedToId) {
        await this.cacheManager.del(`user_tasks_assigned:${dto.assignedToId}`);
        }
        return savedTask;
    }

    async getTaskById(taskId: string): Promise<Task> {
        const cacheKey = `task_detail:${taskId}`;
        const cachedTask= await this.cacheManager.get<Task>(cacheKey);
        if (cachedTask) {
            return cachedTask;
        }
        const task = await this.taskRepo.findOne({ where: { taskId },
        relations: ['project'],
    });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        await this.cacheManager.set(cacheKey, task, 1800);
        return task;
    }

    async updateTask(taskId: string, dto: UpdateTaskDto){
        const task = await this.getTaskById(taskId);
        Object.assign(task, dto);
        const updatedTask = await this.taskRepo.save(task);
        await this.cacheManager.del(`task_detail:${taskId}`);
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
            await this.cacheManager.del(`task_detail:${taskId}`);
            return updatedTask;
        } else {
            throw new ForbiddenException('You do not have permission to update the task status');
        }
    }

    async deleteTask(taskId: string){
        const task = await this.getTaskById(taskId);
        await this.taskRepo.remove(task);
        await this.cacheManager.del(`task_detail:${taskId}`);
        return{ message: 'Task deleted successfully'};
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
            where: { assignedToId: userId }, 
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

  async getProjectTasks(projectId: string, pagination:PaginationDto){
    const { page=1, limit=10 } = pagination;
    const skip = (page - 1) * limit;
    const cacheKey = `project_tasks_${projectId}_p${page}_l${limit}`;
    const cachedData= await this.cacheManager.get<{data: Task[], meta: {total: number, page: number, lastPage: number}}>(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const [tasks, total] = await this.taskRepo.findAndCount({
        where: { projectId },
        relations: ['assignedTo'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
    });

    return{
        data: tasks,
        meta:{
            total,
            page,
            lastPage: Math.ceil(total/limit),
        },
    };
  }
}
