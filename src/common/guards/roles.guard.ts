import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { ProjectsService } from 'src/projects/projects.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TasksService } from 'src/tasks/tasks.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('RolesGuard: Checking access permissions');
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    let projectId;

    console.log('RolesGuard: request.params:', request.params);
    console.log('RolesGuard: request.body:', request.body);
    console.log('RolesGuard: request.query:', request.query);

    projectId =
      request.params?.projectId ||
      request.body?.projectId ||
      request.query?.projectId;

    console.log(
      'RolesGuard: Extracted projectId:',
      projectId,
      'taskId:',
      request.params?.taskId,
    );
    if (!projectId && request.params?.taskId) {
      try {
        console.log(
          'RolesGuard: Looking up project for Task ID:',
          request.params.taskId,
        );
        const task = await this.tasksService.getTaskById(request.params.taskId);
        console.log('RolesGuard: Found Task:', task);
        console.log('RolesGuard: Task projectId:', task?.projectId);
        if (!task) {
          throw new BadRequestException('Task not found');
        }
        projectId = task.projectId;
        console.log('RolesGuard: Extracted projectId from task:', projectId);
      } catch (error) {
        console.log('RolesGuard: Error fetching task:', error.message);
        console.log('RolesGuard: Error stack:', error.stack);
        throw new BadRequestException(
          'Task not found or cannot access project',
        );
      }
    }

    if (!projectId) {
      throw new ForbiddenException('Project ID is missing');
    }

    const membership = await this.projectsService.getMemberRole(
      projectId,
      user.userId,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }

    request.projectRole = membership.role;

    return requiredRoles.includes(membership.role);
  }
}
