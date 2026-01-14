import { ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { Between, LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { ProjectsService } from 'src/projects/projects.service';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';


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

    async getMyTasks(userId: string): Promise<Task[]|{message:string}> {
        const cacheKey = `user_tasks_assigned:${userId}`;
        const cachedTasks= await this.cacheManager.get<Task[]>(cacheKey);
        if (cachedTasks) {
            return cachedTasks;
        }
        const tasks = await this.taskRepo.find({ where: { assignedToId: userId }, 
            relations: ['project'],
            order: { updatedAt: 'DESC' }
         });
        await this.cacheManager.set(cacheKey, tasks, 1800);
         if (tasks.length === 0) {
        return { message: 'You do not have any assigned tasks' };
    }
        return tasks;
    }

    async getTaskByTimeframe(projectId: string, startDate?: string, endDate?: string): Promise<Task[]> {
        const where: any = { projectId };
        if (startDate && endDate) {
            where.createdAt = Between(new Date(startDate), new Date(endDate));
        } else if (startDate) {
            where.createdAt = MoreThanOrEqual(new Date(startDate));
        }
        else if (endDate) {
            where.createdAt = LessThanOrEqual(new Date(endDate));
        }
        const tasks = await this.taskRepo.find({
            where,
            relations: ['project'],
            order: { createdAt: 'DESC' }
         });
        return tasks;
    }
}