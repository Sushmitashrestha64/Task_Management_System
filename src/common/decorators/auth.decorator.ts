import { applyDecorators, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../guards/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "./roles.decorator";
import { ProjectRole } from "src/projects/entity/project-member.entity";

export function Auth(...roles: ProjectRole[]) {
    if (roles.length === 0) {
    return applyDecorators(UseGuards(JwtAuthGuard));
  }
    return applyDecorators(
        Roles(...roles),
        UseGuards(JwtAuthGuard, RolesGuard),
    );
}

