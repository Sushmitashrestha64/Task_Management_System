import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ProjectRole } from 'src/projects/entity/project-member.entity';
import { ActivityLogService } from './activity-log.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Activity Log')
@ApiBearerAuth()
@Controller('activity-log')
export class ActivityLogController {
   constructor(
    private readonly activityLogService: ActivityLogService,
   ) {}

    @Auth(ProjectRole.ADMIN, ProjectRole.PROJECT_MANAGER)
    @Get(':projectId/activities')
    async getActivities(@Param('projectId') projectId: string, @Query() pagination: PaginationDto) {
       return this.activityLogService.getLogs(projectId, pagination);
    }
}
