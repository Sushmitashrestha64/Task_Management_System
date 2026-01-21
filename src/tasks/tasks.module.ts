import { forwardRef, Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entity/task.entity';
import { ProjectsModule } from 'src/projects/projects.module';
import { TaskComment } from './entity/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskComment]),
    forwardRef(() => ProjectsModule)
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService, TypeOrmModule],
})
export class TasksModule {}
