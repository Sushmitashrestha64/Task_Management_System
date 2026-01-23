import { Inject, Logger, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-yet'; // Use redisStore
import { AppController } from './app.controller';
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
  controllers: [AppController],
  providers: [AppService, CleanupService],
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
      const cacheStore: any = this.cache;
      const testKey = 'redis:connection:test';
      const testValue = 'connected';
      
      await this.cache.set(testKey, testValue, 10000); 
      const retrieved = await this.cache.get(testKey);
      const isRealRedis = !!cacheStore?.store?.client || !!cacheStore?.client;

      if (retrieved === testValue) {
        if (isRealRedis) {
          this.logger.log(`✅ Success: Connected to DOCKER REDIS at ${redisHost}`);
        } else {
          this.logger.warn(`⚠️ Warning: connected to MEMORY cache (fallback) - check your Redis config.`);
        }
      }

      await this.cache.del(testKey);
    } catch (error) {
      this.logger.error(`❌ Redis connection error: ${error.message}`);
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, RequestIdMiddleware).forRoutes('*');
  }
}