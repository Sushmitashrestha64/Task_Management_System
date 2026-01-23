import { Injectable } from "@nestjs/common";
import { ActivityAction, ActivityLog } from "./entity/activity-log.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { PaginationDto } from "src/common/dto/pagination.dto";


@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private logRepository: Repository<ActivityLog>,
  ) {}

  @OnEvent('project.activity')
  async handleActivity(payload:{
    projectId:string, 
    userId:string, 
    action:ActivityAction, 
    details:string,
  }){
    const log = this.logRepository.create(payload);
    await this.logRepository.save(log);
  }

  async getLogs(projectId: string, pagination:PaginationDto){
    const { page = 1, limit = 10 } = pagination;
    const [data, total] = await this.logRepository.findAndCount({
      where: { projectId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
  });
  return { 
    data,
    meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }
}


  