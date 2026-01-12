import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole } from "src/projects/entity/project-member.entity";
import { ProjectsService } from "src/projects/projects.service";
import { ROLES_KEY } from "../decorators/roles.decorators";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<ProjectRole[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;


    const projectId = request.params.projectId || request.body.projectId || request.query.projectId;
    if (!projectId) {
        throw new ForbiddenException('Project ID is missing');
    }

    const membership = await this.projectsService.getMemberRole(projectId, user.userId);
    if (!membership) {
        throw new ForbiddenException('You are not a member of this project');
    }

    request.projectRole = membership.role;
    
    return requiredRoles.includes(membership.role);
  }
}
