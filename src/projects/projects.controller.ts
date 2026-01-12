import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AcceptInvitationDto, AddProjectMemberDto, ChangeMemberRoleDto, CreateProjectDto, InviteMemberDto, UpdateProjectDto } from './dto/project.dto';
import { User } from 'src/common/decorators/user.decorator';


@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@User('userId') userId: string, 
         @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(userId, dto);
  }


  @Get()
  findAll(@User('userId') userId: string) {
    return this.projectsService.findAllProjects(userId);
  }

  @Get(':projectId')
  findOne(@User('userId') userId: string,
          @Param('projectId') projectId: string) {
    return this.projectsService.getProjectById(projectId, userId);
  }

  @Patch(':projectId')
  update(@User('userId') userId: string,
         @Param('projectId') projectId: string,
         @Body() dto: UpdateProjectDto) {
    return this.projectsService.updateProject(projectId, userId, dto);
  }

  @Delete(':projectId')
  remove(@User('userId') userId: string,
         @Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(projectId, userId);
  }


  //member
  @Post(':projectId/members')
  async addMember(@Param('projectId') projectId: string, @Body() dto: AddProjectMemberDto) {
    return this.projectsService.addProjectMember(projectId, dto);
  }

  @Patch(':projectId/members/:userId/role')
  async changeMemberRole(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.projectsService.changeMemberRole(projectId, userId, dto);
  }

  @Post(':projectId/invite')
  async inviteMember(@Param('projectId') projectId: string, @Body() dto: InviteMemberDto) {
    await this.projectsService.sendInvitationEmail(projectId, dto);
    return { message: 'Invitation sent successfully' };
  }

  @Post('invitation/accept')
  acceptInvitation(@User('userId') userId: string, @User('email') email: string, @Query() dto:AcceptInvitationDto) {
    return this.projectsService.acceptInvitation(userId, email, dto);
  }

  @Delete(':projectId/members/:userId')
  removeMember(@Param('projectId') projectId: string, @Param('userId') memberUserId: string) {
    return this.projectsService.removeProjectMember(projectId, memberUserId);
  }
}
