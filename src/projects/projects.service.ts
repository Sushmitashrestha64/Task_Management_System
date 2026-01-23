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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Task } from 'src/tasks/entity/task.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityAction } from 'src/activity-log/entity/activity-log.entity';




@Injectable()
export class ProjectsService {
  
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
) {}
  
   async createProject(userId:string, dto:CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({...dto, ownerId: userId });
    const savedProject = await this.projectRepo.save(project);

    await this.projectMemberRepo.save({
      userId: userId,
      projectId: savedProject.projectId,
      role: ProjectRole.ADMIN,
    });

    this.eventEmitter.emit('project.activity', {
      projectId: savedProject.projectId,
      userId,
      action: ActivityAction.PROJECT_CREATED,
      details: `Project ${savedProject.name} created`,
    });
    await this.cacheManager.del(`user_projects_${userId}`);
    return savedProject;
  }

  async findAllProjects(userId: string, pagination: PaginationDto){
    const { page=1, limit=10 } = pagination;
    const skip = (page - 1) * limit;
    const  cacheKey = `user_projects_${userId}_p${page}_l${limit}`;
    const cachedProjects= await this.cacheManager.get<{data: Project[], meta: {total: number, page: number, lastPage: number}}>(cacheKey);
    if (cachedProjects) {
        return cachedProjects;
    }
    const [projects, total] = await this.projectRepo.createQueryBuilder('project')
      .leftJoin('project.members', 'membership', 'membership.userId = :userId', { userId })
      .where('project.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('(project.visibility = :visibility OR membership.userId = :userId)',
     {
      visibility: Visibility.PUBLIC,
      userId,
      },
    )
      .distinct(true)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

      const result = {
        data: projects,
        meta:{
          total,
          page,
          lastPage: Math.ceil(total/limit),
        },
      };

    await this.cacheManager.set(cacheKey, result, 600000);
    return result;
  }    
  
  async getProjectById(projectId: string, userId: string): Promise<Project> {
   const cacheKey = `project_detail:${projectId}`;
   console.log('Fetching project with cache key:', cacheKey);
   let project: Project | null = (await this.cacheManager.get<Project>(cacheKey)) ?? null;

    if (!project) {
      console.log('Key not found in cache, querying database...');
        project =  await this.projectRepo.findOne({where:{ projectId , isDeleted: false }});
        if(!project){
            throw new NotFoundException('Project not found');
        }
      await this.cacheManager.set(cacheKey, project, 600000);
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
    
    this.eventEmitter.emit('project.activity', {
      projectId,
      userId,
      action: ActivityAction.PROJECT_UPDATED,
      details: `Updated project details: ${Object.keys(dto).join(', ')}`,
    });

    await this.cacheManager.del(`project_detail:${projectId}`);
    await this.cacheManager.del(`user_projects_${userId}`);
    return updatedProject;
  }

  async deleteProject(projectId: string, userId: string): Promise<{ message: string }> {
    const project = await this.getProjectById(projectId, userId);
  if (!project) {
    throw new NotFoundException('Project not found');
  }

  project.isDeleted = true;
  project.deletedAt = new Date();
  await this.projectRepo.save(project);

  await this.userRepo.manager.update(Task,
    { projectId },
    { isDeleted: true, deletedAt: new Date() },
  );

  this.eventEmitter.emit('project.activity', {
    projectId,
    userId,
    action: ActivityAction.PROJECT_DELETED,
    details: `Soft deleted the project' ${project.name} 'and all it's tasks.`,
  });

  return { message: 'Project deleted successfully' };
}

 // project members

  async getMemberRole(projectId: string, userId: string): Promise<ProjectMember|null> {
   const member = await this.projectMemberRepo.findOne({ where: { projectId, userId } });
   if (!member) {
      throw new NotFoundException('You are not a member of this project');
   }
   return member;
 }

  async addProjectMember(projectId: string, operatorId: string, dto: AddProjectMemberDto): Promise<ProjectMember> {
    const existing = await  this.projectMemberRepo.findOne({ where: { projectId, userId: dto.userId } });
    if (existing) {
      throw new ForbiddenException('User is already a member of the project');
    }
    const newMember = await this.projectMemberRepo.save({
      projectId,
      userId: dto.userId,
      role: dto.role,
    });

     this.eventEmitter.emit('project.activity', {
        projectId,
        userId: operatorId,
        action: ActivityAction.MEMBER_ADDED,
        details: `Added user ${dto.userId} as ${dto.role}`,
    });

    await this.cacheManager.del(`project_detail:${projectId}`);
    return newMember;
  }

  async changeMemberRole(projectId: string, userId: string, dto:ChangeMemberRoleDto, operatorId: string): Promise<ProjectMember> {
    const membership = await this.projectMemberRepo.findOne({ where: { projectId, userId }});
    if (!membership) {
      throw new NotFoundException('Member not found in this project');
    }
    const oldRole = membership.role;
    membership.role = dto.role;
    const updated = await this.projectMemberRepo.save(membership);

    this.eventEmitter.emit('project.activity', {
      projectId,
      userId: operatorId,
      action: ActivityAction.MEMBER_ROLE_CHANGED,
      details: `Changed role of user ${userId} from ${oldRole} to ${dto.role}`,
    });
    return updated;
  }
  
  async removeProjectMember(projectId: string, userId: string, operatorId: string) {
    const project = await this.projectRepo.findOne({
        where: { projectId }, 
        select:['projectId','name','ownerId', 'visibility']});
    if (!project) {
      throw new NotFoundException('Project not found');
    }
     if(project.ownerId === userId){
      throw new ForbiddenException('Project owner cannot be removed from the project');
     }
     await this.projectMemberRepo.delete({ projectId, userId });

    this.eventEmitter.emit('project.activity', {
      projectId,
      userId: operatorId,
      action: ActivityAction.MEMBER_REMOVED,
      details: `Removed user ${userId} from the project.`,
   });
    return { message: 'Member removed successfully' };
  }

  async listProjectMembers(projectId: string, pagination: PaginationDto): Promise<any> {
    const { page=1, limit=10 } = pagination;
    const skip = (page - 1) * limit;
    const cacheKey = `project_members_${projectId}_p${page}_l${limit}`;
    const cachedMembers= await this.cacheManager.get(cacheKey);
    if (cachedMembers) {
        return cachedMembers;
    }
    const [members, total] = await this.projectMemberRepo.findAndCount({ 
      where: { projectId },
      relations: ['user'], 
      skip,
      take: limit,
     });

     const result = {
      data: members,
      meta:{
        total,
        page,
        lastPage: Math.ceil(total/limit),
      },
    };
    await this.cacheManager.set(cacheKey, result, 600);
    return result;
  }

  // Invitations  
  async sendInvitationEmail(projectId: string, dto: InviteMemberDto, operatorId: string): Promise<void> {
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
    this.eventEmitter.emit('project.activity', {
      projectId,
      userId: operatorId,
      action: ActivityAction.INVITATION_SENT,
      details: `Sent invitation to ${dto.email} as ${dto.role}. ${isNewUser ? '(New account created)' : ''}`,
    });

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

        this.eventEmitter.emit('project.activity', {
        projectId: payload.projectId,
        userId: user.userId, 
        action: ActivityAction.INVITATION_ACCEPTED,
        details: `Accepted the invitation and joined the project as ${payload.role}`,
      });
        await this.cacheManager.del(`project_members_${payload.projectId}`);
        await this.cacheManager.del(`user_projects_${user.userId}`);
        
        return savedMember;
    }catch(error){  
        if (error instanceof ForbiddenException) throw error;
        throw new BadRequestException('Invalid or expired invitation token');
    }
  }
}