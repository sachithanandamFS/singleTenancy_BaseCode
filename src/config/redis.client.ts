import Redis from 'ioredis';
import { getRedisConfig, getRedisEnvironmentName } from './redis.config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export async function initializeRedis(): Promise<Redis> {
  if (redisClient) return redisClient;

  const config = getRedisConfig();
  const env = getRedisEnvironmentName();

  const redisOptions: any = {
    password: config.password,
    username: config.username,
    db: config.db ?? 0,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    // Stop retrying after 3 attempts on startup; reconnect silently in background
    retryStrategy: (times: number) => {
      if (times > 3) return null; // stop retrying during init; ioredis will auto-reconnect
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  };

  if (config.path) {
    redisOptions.path = config.path;
    redisClient = new Redis(redisOptions);
  } else {
    redisOptions.host = config.host ?? '127.0.0.1';
    redisOptions.port = config.port ?? 6379;
    redisClient = new Redis(redisOptions);
  }

  redisClient.on('connect', () => {
    const connInfo = config.path ? `Unix socket: ${config.path}` : `${config.host}:${config.port}`;
    logger.info(`[Redis] Connected to ${env} (${connInfo})`);
  });

  redisClient.on('error', (err: Error) => logger.error('[Redis] Error:', err.message));
  redisClient.on('reconnecting', () => logger.info('[Redis] Reconnecting...'));

  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info('[Redis] Ping successful');
  } catch (err) {
    logger.warn('[Redis] Could not connect on startup — will retry in background', { error: (err as Error).message });
  }

  return redisClient;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[Redis] Connection closed');
  }
}

export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}

export type { Redis };
