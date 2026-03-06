/**
 * Redis Client Singleton
 * Manages connection to Redis for OTP and caching
 */

import Redis from "ioredis";
import { getRedisConfig, getRedisEnvironmentName } from "./redis.config.js";
import { logger } from "../utils/logger.js";

let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<Redis> {
  if (redisClient) {
    return redisClient;
  }

  const config = getRedisConfig();
  const env = getRedisEnvironmentName();

  try {
    // Support both TCP and Unix socket connections
    const redisOptions: any = {
      password: config.password,
      username: config.username,
      db: config.db || 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: false,
      enableOfflineQueue: true,
    };

    // Use Unix socket if path is provided, otherwise use TCP
    if (config.path) {
      redisOptions.path = config.path;
      redisClient = new Redis(redisOptions);
    } else {
      redisOptions.host = config.host || "127.0.0.1";
      redisOptions.port = config.port || 6379;
      redisClient = new Redis(redisOptions);
    }

    // Event handlers
    redisClient.on("connect", () => {
      const connInfo = config.path 
        ? `Unix socket: ${config.path}`
        : `${config.host}:${config.port}`;
      logger.info(
        `[Redis] Connected to ${env} environment (${connInfo})`
      );
    });

    redisClient.on("error", (err: Error) => {
      logger.error("[Redis] Connection error:", err.message);
    });

    redisClient.on("reconnecting", () => {
      logger.info("[Redis] Attempting to reconnect...");
    });

    // Test connection
    await redisClient.ping();
    logger.info(`[Redis] Ping successful`);

    return redisClient;
  } catch (error) {
    logger.error("[Redis] Initialization failed:", error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error(
      "Redis client not initialized. Call initializeRedis() first."
    );
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("[Redis] Connection closed");
  }
}

/**
 * Get connection status
 */
export function isRedisConnected(): boolean {
  return redisClient ? redisClient.status === "ready" : false;
}

export type { Redis };
