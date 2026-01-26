import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const redisHost = configService.get<string>('REDIS_HOST');
    const redisPort = configService.get<number>('REDIS_PORT');
    const redisPassword = configService.get<string>('REDIS_PASSWORD');

    console.log('\n🔧 Redis Config:', {
      host: redisHost,
      port: redisPort,
      hasPassword: !!redisPassword,
    });

    const store = await redisStore({
      socket: {
        host: redisHost,
        port: Number(redisPort) || 6379,
      },
      password: redisPassword || undefined,
    });

    console.log('✅ Redis store created successfully\n');
    return { 
      store,
      ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    };
  },
};
