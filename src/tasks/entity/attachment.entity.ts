import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entity/user.entity';

@Entity('task_attachments')
export class TaskAttachment {
    
  @PrimaryGeneratedColumn('uuid')
  attachmentId: string;

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'uuid' })
  @Index() 
  taskId: string;

  @Column({ type: 'uuid' })
  uploaderId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @CreateDateColumn()
  createdAt: Date;
}