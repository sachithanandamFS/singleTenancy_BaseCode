/**
 * Redis Configuration
 * Supports hosting.com (LiteSpeed Redis Cache) and AWS ElastiCache
 * Environment-aware setup - just change config vars for seamless migration
 */

import dotenv from "dotenv";

dotenv.config();

export type RedisEnvironment = "hosting.com" | "aws" | "development" | "production";

interface RedisConfig {
  host?: string;
  port?: number;
  path?: string; // Unix socket path (e.g., /home/user/.redis/redis.sock)
  password?: string;
  db?: number;
  tls?: boolean;
  username?: string; // For AWS ElastiCache with AUTH
}

type RedisConfigMap = {
  [key in RedisEnvironment]: RedisConfig;
};

/**
 * Get Redis environment based on NODE_ENV and REDIS_PROVIDER
 */
function getRedisEnvironment(): RedisEnvironment {
  const provider = process.env.REDIS_PROVIDER || "development";
  const nodeEnv = process.env.NODE_ENV || "development";

  // If explicitly set, use that
  if (provider === "hosting.com" || provider === "aws") {
    return provider;
  }

  // Otherwise, map NODE_ENV
  if (nodeEnv === "production") {
    return process.env.REDIS_PROVIDER === "hosting.com" ? "hosting.com" : "aws";
  }

  return "development";
}

/**
 * Redis configurations for different environments
 */
const redisConfigs: RedisConfigMap = {
  // Development - Local Redis
  development: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
  },

  // Hosting.com - LiteSpeed Redis Cache Manager
  // Access via: cpanel > LiteSpeed Cache > Redis Cache Manager
  // Supports both TCP and Unix socket connections
  "hosting.com": {
    path: process.env.REDIS_SOCKET_PATH || "/home/username/.redis/redis.sock",
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    // LiteSpeed typically runs locally, no TLS needed
    tls: false,
  },

  // AWS ElastiCache
  // Supports both standalone and cluster mode
  aws: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined, // For AUTH token
    tls: process.env.REDIS_TLS === "true" ? true : false,
    db: 0, // ElastiCache doesn't support SELECT in cluster mode
  },

  // Production - Generic (fallback to AWS)
  production: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    tls: process.env.REDIS_TLS === "true" ? true : false,
    db: 0,
  },
};

export function getRedisConfig(): RedisConfig {
  const env = getRedisEnvironment();
  return redisConfigs[env as keyof RedisConfigMap];
}

export function getRedisEnvironmentName(): RedisEnvironment {
  return getRedisEnvironment();
}

export type { RedisConfig, RedisConfigMap };
