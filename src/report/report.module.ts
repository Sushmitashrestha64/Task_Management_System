import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { B2Service } from 'src/b2/b2.service';

@Module({
  imports: [TasksModule, ProjectsModule],
  controllers: [ReportController],
  providers: [ReportService,B2Service],
})
export class ReportModule {}
