import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AcceptInvitationDto, AddProjectMemberDto, ChangeMemberRoleDto, CreateProjectDto, InviteMemberDto, UpdateProjectDto } from './dto/project.dto';
import { User } from 'src/common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { ProjectRole } from './entity/project-member.entity';


@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Auth()
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@User('userId') userId: string, 
         @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(userId, dto);
  }

  @Auth()
  @Get()
  @ApiOperation({ summary: 'Get all public projects + those you are a member of' })
  findAll(@User('userId') userId: string) {
    return this.projectsService.findAllProjects(userId);
  }

  @Auth()
  @ApiOperation({ summary: 'Get project details' })
  @Get(':projectId')
  findOne(@User('userId') userId: string,
          @Param('projectId') projectId: string) {
    return this.projectsService.getProjectById(projectId, userId);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update project details' })
  @Patch(':projectId')
  update(@User('userId') userId: string,
         @Param('projectId') projectId: string,
         @Body() dto: UpdateProjectDto) {
    return this.projectsService.updateProject(projectId, userId, dto);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete project' })
  remove(@User('userId') userId: string,
         @Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(projectId, userId);
  }


  //member
  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER)
  @UseGuards(RolesGuard)
  @Post(':projectId/members')
  @ApiOperation({ summary: 'Add a member directly' })
  async addMember(@Param('projectId') projectId: string, @Body() dto: AddProjectMemberDto) {
    return this.projectsService.addProjectMember(projectId, dto);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER)
  @UseGuards(RolesGuard)
  @Patch(':projectId/members/:userId/role')
  @ApiOperation({ summary: 'Change a member role' })
  async changeMemberRole(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.projectsService.changeMemberRole(projectId, userId, dto);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER)
  @UseGuards(RolesGuard)
  @Post(':projectId/invite')
  @ApiOperation({ summary: 'Send email invitation' })
  async inviteMember(@Param('projectId') projectId: string, @Body() dto: InviteMemberDto) {
    await this.projectsService.sendInvitationEmail(projectId, dto);
    return { message: 'Invitation sent successfully' };
  }

  @Auth()
  @Post('invitation/accept')
  @ApiOperation({ summary: 'Accept invitation from email link' })
  acceptInvitation(@User('userId') userId: string, @User('email') email: string, @Query() dto:AcceptInvitationDto) {
    return this.projectsService.acceptInvitation(userId, email, dto);
  }

  @Auth()
  @Roles(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER)
  @UseGuards(RolesGuard)
  @Delete(':projectId/members/:userId')
  @ApiOperation({ summary: 'Remove a member' })
  removeMember(@Param('projectId') projectId: string, @Param('userId') memberUserId: string) {
    return this.projectsService.removeProjectMember(projectId, memberUserId);
  }
}
