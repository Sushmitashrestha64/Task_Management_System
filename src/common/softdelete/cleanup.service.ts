import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../tasks/entity/task.entity';
import { Project } from '../../projects/entity/project.entity';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) 
  async cleanOldDeletedData() {
    this.logger.log(' Nightly Hard-Delete Job Started ');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 30);

    try {
      const taskRes = await this.taskRepo.delete({
        isDeleted: true,
        deletedAt: LessThan(expiryDate),
      });
      this.logger.log(`Hard-deleted ${taskRes.affected} expired tasks.`);

      const projectRes = await this.projectRepo.delete({
        isDeleted: true,
        deletedAt: LessThan(expiryDate),
      });
      this.logger.log(`Hard-deleted ${projectRes.affected} expired projects.`);

    } catch (error) {
      this.logger.error('Error during cleanup job', error.stack);
    }

    this.logger.log(' Nightly Hard-Delete Job Finished ');
  }
}