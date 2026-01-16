import { Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { User } from 'src/common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';

@ApiTags('Report')
@ApiBearerAuth()
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

    @Auth()
    @Post(':projectId/generate')
    @ApiOperation({ summary: 'Generate project report and upload to Backblaze' })
    async handleReport(
        @Param('projectId') projectId: string,
        @User('userId') userId: string,
        @Query() query: ReportQueryDto,
    ) {
        return this.reportService.generateAndUploadReport(projectId, userId, query);
  }
}