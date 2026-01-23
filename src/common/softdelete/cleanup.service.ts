import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../tasks/entity/task.entity';
import { Project } from '../../projects/entity/project.entity';
import { ActivityLog } from 'src/activity-log/entity/activity-log.entity';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(ActivityLog) private activityLogRepo: Repository<ActivityLog>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) 
  async cleanOldDeletedData() {
    this.logger.log('Nightly Cleanup Job Started');

   const softDeleteExpiry =new Date();
   softDeleteExpiry.setDate(softDeleteExpiry.getDate() - 30);

   const logExpiry = new Date();
   logExpiry.setDate(logExpiry.getDate() - 30);

    try {
      const taskRes = await this.taskRepo.delete({
        isDeleted: true,
        deletedAt: LessThan(softDeleteExpiry),
      });
      this.logger.log(`Hard-deleted ${taskRes.affected} expired tasks.`);

      const projectRes = await this.projectRepo.delete({
        isDeleted: true,
        deletedAt: LessThan(softDeleteExpiry),
      });
      this.logger.log(`Hard-deleted ${projectRes.affected} expired projects.`);

      const logRes = await this.activityLogRepo.delete({
        createdAt: LessThan(logExpiry),
      });
      this.logger.log(`Purged ${logRes.affected} old activity logs.`);

    } catch (error) {
      this.logger.error('Error during cleanup job', error.stack);
    }

    this.logger.log('Nightly Cleanup Job Finished');
  }
}