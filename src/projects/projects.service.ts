import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entity/project.entity';
import { Repository } from 'typeorm';
import { ProjectMember, ProjectRole } from './entity/project-member.entity';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { AcceptInvitationDto, AddProjectMemberDto, ChangeMemberRoleDto, CreateProjectDto, InviteMemberDto, UpdateProjectDto } from './dto/project.dto';
import { Visibility } from './entity/project.entity';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class ProjectsService {
  
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepo: Repository<ProjectMember>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
) {}
  
   async createProject(userId:string, dto:CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({...dto, ownerId: userId });
    const savedProject = await this.projectRepo.save(project);

    await this.projectMemberRepo.save({
      userId: userId,
      projectId: savedProject.projectId,
      role: ProjectRole.ADMIN,
    });
    return savedProject;
  }

  async findAllProjects(userId: string){
    return this.projectRepo.createQueryBuilder('project')
      .leftJoin('project.members', 'membership', 'membership.userId = :userId', { userId })
      .where('project.visibility =:public',{ public: Visibility.PUBLIC })
      .orWhere('membership.userId = :userId', { userId })
      .distinct(true)
      .getMany(); 
  }    
  
  async getProjectById(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { projectId} });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.visibility === Visibility.PRIVATE) {
        const membership = await this.getMemberRole(projectId, userId);
        if (!membership) {
          throw new ForbiddenException('Access denied to private project');
        }
    }
    return project;
  }
   
  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.getProjectById(projectId, userId);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    await this.projectRepo.remove(project);
 }

 // project members

  async getMemberRole(projectId: string, userId: string): Promise<ProjectMember|null> {
   return await this.projectMemberRepo.findOne({ where: { projectId, userId } });
 }

  async addProjectMember(projectId: string, dto: AddProjectMemberDto): Promise<ProjectMember> {
    const existing = await  this.projectMemberRepo.findOne({ where: { projectId, userId: dto.userId } });
    if (existing) {
      throw new ForbiddenException('User is already a member of the project');
    }
    return this.projectMemberRepo.save({
      projectId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  async changeMemberRole(projectId: string, userId: string, dto:ChangeMemberRoleDto): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({ where: { projectId, userId }});
    if (!membership) {
      throw new NotFoundException('Member not found in this project');
    }
    membership.role = dto.role;
    return this.projectMemberRepo.save(membership);
  }
  
  async removeProjectMember(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({
        where: { projectId }, 
        select:['projectId','name','ownerId', 'visibility']});
    if (!project) {
      throw new NotFoundException('Project not found');
    }
     if(project.ownerId === userId){
      throw new ForbiddenException('Project owner cannot be removed from the project');
     }
     return this.projectMemberRepo.delete({ projectId, userId });
  }

  async listProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.projectMemberRepo.find({ where: { projectId }, relations: ['user'] });
  }

  // Invitations  
  async sendInvitationEmail(projectId: string, dto: InviteMemberDto): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existingMember = await this.projectMemberRepo.findOne({
    where: {  project:{projectId}, user: { email: dto.email } }, 
    relations: ['user'],
    });
    if (existingMember) {
      throw new ForbiddenException('User is already a member of this project');
    }

    const tokenPayload = { projectId: project.projectId, email: dto.email, role: dto.role };
    const token = this.jwtService.sign(tokenPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '3d',
    });
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/projects/accept-invitation?token=${token}`;

    try{
    await this.mailerService.sendMail({
        to:dto.email,
        subject: `Invitation to join project: ${project.name}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
               <h2>Invitation to ${project.name}</h2>
               <p>You have been invited to join this project as a <b>${dto.role}</b>.</p>
               <p>Click the button below to accept the invitation and join the team:</p>
               <a href="${inviteUrl}" style="background-color: #ae0b11; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
               <p style="margin-top: 20px; font-size: 12px; color: #777;">This link will expire in 3 days.</p>
            </div>`,
    });
    }catch(error){
        throw new InternalServerErrorException('Failed to sent invitation');
    }
  }

  async acceptInvitation(userId:string, email:string, dto: AcceptInvitationDto): Promise<ProjectMember> {
    try{
        const payload = await this.jwtService.verify<{ projectId: string; email: string; role: string }>(dto.token, {
            secret: this.configService.get('JWT_SECRET'),
        });

        if (payload.email !== email) {
            throw new ForbiddenException('This invitation was sent to different email');
        }

        const existingMember = await this.projectMemberRepo.findOne({
            where: { projectId: payload.projectId, userId: userId }, 
        });
        if (existingMember) {
            throw new ForbiddenException('You are already a member of this project');
        }
        
        const newMember = this.projectMemberRepo.create({
            projectId: payload.projectId,
            userId: userId,
            role: payload.role as ProjectRole,
        });
        return this.projectMemberRepo.save(newMember);
    }catch(error){  
        throw new BadRequestException('Invalid or expired invitation token');
    }
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const count = await this.projectMemberRepo.count({ where: { projectId, userId } });
    return count > 0;
  }
}