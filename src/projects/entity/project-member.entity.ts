import { User } from '../../users/entity/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from './project.entity';

export enum ProjectRole {
  ADMIN = 'ADMIN',             
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  LEAD = 'LEAD',               
  MEMBER = 'MEMBER',           
  USER = 'USER',             
}

@Entity('project_members')
@Unique(['userId', 'projectId']) 
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  roleId: string;

  @Column({ type: 'uuid' })
  userId: string;
  
  @Index()
  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.USER })
  role: ProjectRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}



