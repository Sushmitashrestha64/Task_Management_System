import { Body, Controller, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AcceptInvitationDto, CreateProjectDto, InviteMemberDto, UpdateProjectDto } from './dto/project.dto';
import { User } from 'src/common/decorators/user.decorator';


@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  create(@User('userId') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(userId, dto);
  }


  findAll(@User('userId') userId: string) {
    return this.projectsService.findAllProjects(userId);
  }

  findOne(@User('userId') userId: string, @Param('projectId') projectId: string) {
    return this.projectsService.getProjectById(projectId, userId);
  }

  update(@User('userId') userId: string, @Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.updateProject(projectId, userId, dto);
  }

  remove(@User('userId') userId: string, @Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(projectId, userId);
  }


  //member
  async inviteMember(@Param('projectId') projectId: string, @Body() dto: InviteMemberDto) {
    await this.projectsService.sendInvitationEmail(projectId, dto);
    return { message: 'Invitation sent successfully' };
  }

  acceptInvitation(@User('userId') userId: string, @User('email') email: string, @Query() dto:AcceptInvitationDto) {
    return this.projectsService.acceptInvitation(userId, email, dto);
  }

  removeMember(@Param('projectId') projectId: string, @Param('userId') memberUserId: string) {
    return this.projectsService.removeProjectMember(projectId, memberUserId);
  }
}
