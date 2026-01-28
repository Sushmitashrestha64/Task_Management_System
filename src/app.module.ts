import { Inject, Logger, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { AppController, HealthController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { OtpModule } from './otp/otp.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { DataSource } from 'typeorm';
import { LoggerMiddleware } from './common/middleware/logger/logger.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id/request-id.middleware';
import { ReportModule } from './report/report.module';
import { B2Module } from './b2/b2.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './common/softdelete/cleanup.service';
import { Task } from './tasks/entity/task.entity';
import { Project } from './projects/entity/project.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { ActivityLog } from './activity-log/entity/activity-log.entity';
import { cacheConfig } from './config/redis.config';
import { ThrottlerModule , ThrottlerGuard} from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';


@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Project, Task, ActivityLog]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        isGlobal: true,
        transport: {
          host: config.get('MAIL_HOST'),
          port: config.get('MAIL_PORT'),
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
          tls: { rejectUnauthorized: false },
        },
        defaults: {
          from: config.get('MAIL_FROM'),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: Number(configService.get<string>('DATABASE_PORT')),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        ssl: configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    CacheModule.registerAsync(cacheConfig),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    OtpModule,
    ReportModule,
    B2Module,
    ActivityLogModule,
  ],
  controllers: [AppController,HealthController],
  providers: [AppService, CleanupService,
    { provide: APP_GUARD, useClass: ThrottlerGuard},
    { provide: APP_FILTER, useClass: AllExceptionsFilter }, 
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    this.logger.log(`🔌 Attempting to connect to Redis at ${redisHost}...`);

    try { 
      // Test the connection with actual read/write
      await this.cache.set('test:connection', 'ok', 5000);
      const value = await this.cache.get('test:connection');
      
      if (value === 'ok') {
        this.logger.log(`✅ Success: Connected to Redis at ${redisHost}`);
        this.logger.log(`✅ Redis read/write test successful`);
        await this.cache.del('test:connection');
      } else {
        this.logger.warn(`⚠️ Warning: Cache test failed - using in-memory fallback`);
      }
    } catch (error) {
      this.logger.error(`❌ Redis connection error: ${error.message}`);
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, RequestIdMiddleware).forRoutes('*');
  }
}