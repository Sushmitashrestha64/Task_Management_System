import { ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { ProjectsService } from 'src/projects/projects.service';


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
        const task = await this.taskRepo.findOne({ where: { taskId } });
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
        if(task.assignedToId !== userId){
            throw new ForbiddenException('Only the assigned user can update the status of this task');
        }
        task.status = dto.status;
        return this.taskRepo.save(task);
    }

    async deleteTask(taskId: string){
        const task = await this.getTaskById(taskId);
        await this.taskRepo.remove(task);
        return{ message: 'Task deleted successfully' };
    }
}