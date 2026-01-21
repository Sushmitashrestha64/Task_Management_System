import { Inject, Logger, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as redisStore from 'cache-manager-redis-store';
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
import{ CleanupService } from './common/softdelete/cleanup.service';
import { Task } from './tasks/entity/task.entity';
import { Project } from './projects/entity/project.entity';

@Module({
  imports: [
  ScheduleModule.forRoot(),
  TypeOrmModule.forFeature([Project, Task]),
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
          tls:{ rejectUnauthorized: false },
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,                      
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        auth_pass: configService.get<string>('REDIS_PASSWORD'),
        ttl: configService.get<number>('REDIS_TTL'), 
  }),
}),
    AuthModule, UsersModule, ProjectsModule, TasksModule, OtpModule, ReportModule, B2Module],
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
    const redisPort = this.configService.get<number>('REDIS_PORT');
    
    this.logger.log(`Attempting to connect to Redis at ${redisHost}:${redisPort}...`);
    
    try {
      const stores: any = this.cache.stores || [];
      const store = stores[0];
      const storeType = store?.constructor?.name || 'Unknown';
      this.logger.log(`Cache Store Type: ${storeType}`);
      
      const testKey = 'redis:health:check';
      const testValue = `ok-${Date.now()}`;
      
      await this.cache.set(testKey, testValue, 10);
      const retrievedValue = await this.cache.get(testKey);

      if (retrievedValue === testValue) {
        this.logger.log(` Redis connection successful at ${redisHost}:${redisPort}`);
        this.logger.log(` Redis cache is operational and responding correctly`);

        if (store?.client) {
          this.logger.log(`Using actual Redis client (not in-memory)`);
        } else {
          this.logger.warn(`No Redis client found - may be using in-memory cache`);
        }
      } else {
        this.logger.warn(`Redis connected but value mismatch. Expected: ${testValue}, Got: ${retrievedValue}`);
      }
    } catch (error) {
      this.logger.error(
        `✗ Redis connection failed at ${redisHost}:${redisPort} — fallback to in-memory cache`,
        error.stack,
      );
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, RequestIdMiddleware)
      .forRoutes('*');
  }
}
