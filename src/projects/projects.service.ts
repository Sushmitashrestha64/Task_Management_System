import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entity/project.entity';
import { Repository } from 'typeorm';
import { ProjectMember, ProjectRole } from './entity/project-member.entity';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { AcceptInvitationDto, AddProjectMemberDto, ChangeMemberRoleDto, CreateProjectDto, InviteMemberDto, UpdateProjectDto } from './dto/project.dto';
import { Visibility } from './entity/project.entity';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from 'src/users/entity/user.entity';
import { CACHE_MANAGER} from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { TasksService } from 'src/tasks/tasks.service';



@Injectable()
export class ProjectsService {
  
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly tasksService: TasksService,
) {}
  
   async createProject(userId:string, dto:CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({...dto, ownerId: userId });
    const savedProject = await this.projectRepo.save(project);

    await this.projectMemberRepo.save({
      userId: userId,
      projectId: savedProject.projectId,
      role: ProjectRole.ADMIN,
    });

    await this.cacheManager.del(`user_projects_${userId}`);
    return savedProject;
  }

  async findAllProjects(userId: string){
    const  cacheKey = `user_projects_${userId}`;
    const cachedProjects= await this.cacheManager.get<Project[]>(cacheKey);
    if (cachedProjects) {
        return cachedProjects;
    }
    const projects = await this.projectRepo.createQueryBuilder('project')
      .leftJoin('project.members', 'membership', 'membership.userId = :userId', { userId })
      .where('project.visibility =:public',{ public: Visibility.PUBLIC })
      .orWhere('membership.userId = :userId', { userId })
      .distinct(true)
      .getMany(); 

    await this.cacheManager.set(cacheKey, projects, 36000);
    return projects;
  }    
  
  async getProjectById(projectId: string, userId: string): Promise<Project> {
    const cacheKey = `project_detail:${projectId}`;
   let project: Project | null = (await this.cacheManager.get<Project>(cacheKey)) ?? null;

    if (!project) {
        project =  await this.projectRepo.findOne({where:{ projectId }});
        if(!project){
            throw new NotFoundException('Project not found');
        }
      await this.cacheManager.set(cacheKey, project, 1800);
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
    const updatedProject = await this.projectRepo.save(project);

    await this.cacheManager.del(`project_detail:${projectId}`);
    await this.cacheManager.del(`user_projects_${userId}`);
    return updatedProject;
  }

  async deleteProject(projectId: string, userId: string): Promise<{ message: string }> {
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    await this.projectRepo.remove(project);

    await this.cacheManager.del(`project_detail:${projectId}`);
    await this.cacheManager.del(`user_projects_${userId}`);
    return{message:'Project deleted successfully' };
 }

 // project members

  async getMemberRole(projectId: string, userId: string): Promise<ProjectMember|null> {
   const member = await this.projectMemberRepo.findOne({ where: { projectId, userId } });
   if (!member) {
      throw new NotFoundException('You are not a member of this project');
   }
   return member;
 }

  async addProjectMember(projectId: string, dto: AddProjectMemberDto): Promise<ProjectMember> {
    const existing = await  this.projectMemberRepo.findOne({ where: { projectId, userId: dto.userId } });
    if (existing) {
      throw new ForbiddenException('User is already a member of the project');
    }
    const newMember = await this.projectMemberRepo.save({
      projectId,
      userId: dto.userId,
      role: dto.role,
    });

    await this.cacheManager.del(`project_detail:${projectId}`);
    await this.cacheManager.del(`user_projects_${dto.userId}`);
    return newMember;
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
    const cacheKey = `project_members_${projectId}`;
    const cachedMembers= await this.cacheManager.get<ProjectMember[]>(cacheKey);
    if (cachedMembers) {
        return cachedMembers;
    }
    const members = await this.projectMemberRepo.find({ where: { projectId }, relations: ['user'] });
    await this.cacheManager.set(cacheKey, members, 1800);
    return members;
  }

  // Invitations  
  async sendInvitationEmail(projectId: string, dto: InviteMemberDto): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let user = await this.userRepo.findOne({ where: { email: dto.email } });
    const isNewUser = !user;
    let tempPassword = '';

    if (isNewUser) {
      tempPassword = randomBytes(4).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user = this.userRepo.create({
        email: dto.email,
        name: dto.email.split('@')[0],
        password: hashedPassword,
        verified: true,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
    }

    const existingMember = await this.projectMemberRepo.findOne({
    where: {  project:{projectId}, user: { email: dto.email } }, 
    relations: ['user'],
    });
    if (existingMember ) {
      throw new ForbiddenException('User is already a member of this project');
    }

    const tokenPayload = { projectId: project.projectId, email: dto.email, role: dto.role,};
    const token = this.jwtService.sign(tokenPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '3d',
    });
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/projects/accept-invitation?token=${token}`;
   

    const emailTitle = isNewUser? 'You are invited to join a project and your account has been created' : 'You are invited to join a project';

    const welcomeMessage = isNewUser ? 
    `<h2>Welcome to the Team!</h2>
       <p>We've created a new account for you to get started immediately.</p>
       <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
         <p style="margin: 0;"><b>Login Email:</b> ${dto.email}</p>
         <p style="margin: 0;"><b>Temporary Password:</b> <code style="color: #ae0b11;">${tempPassword}</code></p>
       </div>
       <p><i>Note: Please change your password as soon as you log in!!</i></p>`
    : `<h2>Hello again!</h2>
       <p>You have been invited to collaborate on a project using your existing account.</p>`;

    try{
    await this.mailerService.sendMail({
        to:dto.email,
        subject: `[Task System] ${emailTitle}: ${project.name}`,
             html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #333;">
          ${welcomeMessage}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p>You have been assigned the role of <b>${dto.role}</b> in the project: <b>${project.name}</b>.</p>
          <p>Click the button below to accept this invitation:</p>
          <a href="${inviteUrl}" style="background: #ae0b11; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept & Join Project</a>
          <p style="margin-top: 20px; font-size: 13px; color: #666;">
            If the button doesn't work, copy this link: <br> ${inviteUrl}
          </p>
        </div>`,
    });
    }catch(error){
        throw new InternalServerErrorException('Failed to sent invitation');
    }
  }

  async acceptInvitation(dto: AcceptInvitationDto): Promise<ProjectMember> {
    try{
        const payload = await this.jwtService.verify<{ projectId: string; email: string; role: string }>(dto.token, {
            secret: this.configService.get('JWT_SECRET'),
        });
        
        const user = await this.userRepo.findOne({ where: { email: payload.email } });
        if (!user) {
            throw new NotFoundException('user not found or email does not match');
        }
        
        const existingMember = await this.projectMemberRepo.findOne({
            where: { projectId: payload.projectId, userId: user.userId }, 
        });
        if (existingMember) {
            throw new ForbiddenException('You are already a member of this project');
        }
        
        const newMember = this.projectMemberRepo.create({
            projectId: payload.projectId,
            userId: user.userId,
            role: payload.role as ProjectRole,
        });
        const savedMember = await this.projectMemberRepo.save(newMember);
        await this.cacheManager.del(`project_members_${payload.projectId}`);
        await this.cacheManager.del(`user_projects_${user.userId}`);
        return savedMember;
    }catch(error){  
        if (error instanceof ForbiddenException) throw error;
        throw new BadRequestException('Invalid or expired invitation token');
    }
  }
}