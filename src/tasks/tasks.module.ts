import { forwardRef, Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { ProjectsModule } from 'src/projects/projects.module';
import { TaskComment } from './entity/comment.entity';
import { TaskAttachment } from './entity/attachment.entity';
import { B2Module } from 'src/b2/b2.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskComment, TaskAttachment]),
    forwardRef(() => ProjectsModule),
    B2Module,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService, TypeOrmModule],
})
export class TasksModule {}
