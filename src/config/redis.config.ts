import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    console.log('\n========================================');
    console.log('🔧 CACHE MODULE FACTORY CALLED');
    console.log('========================================\n');

    const redisHost = configService.get<string>('REDIS_HOST');
    const redisPort = configService.get<number>('REDIS_PORT');
    const redisPassword = configService.get<string>('REDIS_PASSWORD');

    console.log('Redis Config Values:');
    console.log('  Host:', redisHost);
    console.log('  Port:', redisPort);
    console.log('  Has Password:', !!redisPassword);
    console.log('');

    const store = await redisStore({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword,
    });

    console.log('✅ Redis store created:', store.constructor.name);
    console.log('========================================\n');

    return { store };
  },
};
