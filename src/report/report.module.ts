import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from 'src/projects/projects.module';

@Module({
  imports: [TasksModule, ProjectsModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
