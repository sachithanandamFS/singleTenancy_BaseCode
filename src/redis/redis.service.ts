import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { initializeRedis, getRedisClient, closeRedis, isRedisConnected } from '../config/redis.client';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await initializeRedis();
  }

  async onModuleDestroy(): Promise<void> {
    await closeRedis();
  }

  getClient(): Redis {
    return getRedisClient();
  }

  isConnected(): boolean {
    return isRedisConnected();
  }
}
