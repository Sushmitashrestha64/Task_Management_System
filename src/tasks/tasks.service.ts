import { ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { ProjectsService } from 'src/projects/projects.service';
import { ProjectRole } from 'src/projects/entity/project-member.entity';


@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
        @Inject(forwardRef(() => ProjectsService)) private readonly projectsService: ProjectsService,
    ) {}

    async createTask(dto: CreateTaskDto, userId: string): Promise<Task> {
       const isMember = await this.projectsService.getMemberRole(dto.projectId, userId);
         if (!isMember) {
            throw new ForbiddenException('You are not a member of this project');
        }
       
        const task = this.taskRepo.create(dto);
        return this.taskRepo.save(task);
    }

    async getTaskById(taskId: string): Promise<Task> {
        const task = await this.taskRepo.findOne({ where: { taskId },
        relations: ['project'],
     });
        if (!task) {
            throw new NotFoundException('Task not found');
        }

        return task;
    }

    async updateTask(taskId: string, dto: UpdateTaskDto){
        const task = await this.getTaskById(taskId);
        Object.assign(task, dto);
        return this.taskRepo.save(task);
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
            return this.taskRepo.save(task);
        } else {
            throw new ForbiddenException('You do not have permission to update the task status');
        }
    }

    async deleteTask(taskId: string){
        const task = await this.getTaskById(taskId);
        await this.taskRepo.remove(task);
        return{ message: 'Task deleted successfully'};
    }
}