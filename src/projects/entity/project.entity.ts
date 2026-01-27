import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Task } from '../../tasks/entity/task.entity';
import { User } from '../../users/entity/user.entity';

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Entity('projects')
@Index(['ownerId', 'isDeleted'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  projectId: string;

  @Column()
  name: string;
  
  @Column({type: 'text', nullable:true})
  description: string;

  @Column({ type: 'enum', enum: Visibility, default: Visibility.PUBLIC })
  visibility: Visibility;

  @Column({ type: 'uuid' })
  ownerId: string; 

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @ManyToOne(() => User, (user) => user.ownedProjects)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
  
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}