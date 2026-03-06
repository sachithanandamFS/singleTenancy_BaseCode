import jwt, { JwtPayload } from "jsonwebtoken";
import type { StringValue } from "ms";
import { getRedisClient } from "../config/redis.client.js";
import { logger } from "./logger.js";

const secret = process.env.JWT_ACCESS_SECRET as string;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN as string;

export interface JwtUserPayload {
  id: number;
  email: string;
  user_type: number;
  name: string;
  permissions: Array<{ module_id: number; permitted_responsibilities: number[] }>;
}

const resolveAccessSecret = (): string => {
  return secret;
};

const expiresIn = (): StringValue => {
  return ACCESS_TOKEN_EXPIRES_IN as StringValue;
};

export const generateToken = (user: JwtUserPayload): string => {
  const payload: JwtUserPayload = {
    id: user.id,
    email: user.email,
    user_type: user.user_type,
    name: user.name,
    permissions: user.permissions,
  };
  return jwt.sign(payload, resolveAccessSecret(), { expiresIn: expiresIn() });
};

/**
 * Add a token to the Redis blacklist so it cannot be used again.
 * TTL is set to the token's remaining lifetime — Redis auto-expires it.
 * Fails silently so the calling operation (e.g. password change) is not blocked.
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as (JwtUserPayload & JwtPayload) | null;
    if (!decoded?.id || !decoded?.iat || !decoded?.exp) return;

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return; // Already expired — nothing to blacklist

    const redis = getRedisClient();
    await redis.setex(`jwt:bl:${decoded.id}:${decoded.iat}`, ttl, "1");
  } catch (error) {
    logger.warn("Failed to blacklist token", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Verify a JWT and confirm it has not been blacklisted.
 * Fails open on Redis unavailability — the signature check still protects against forgery.
 */
export const verifyToken = async (token: string): Promise<JwtUserPayload & JwtPayload> => {
  const decoded = jwt.verify(token, resolveAccessSecret()) as JwtUserPayload & JwtPayload;

  try {
    const redis = getRedisClient();
    const blacklisted = await redis.get(`jwt:bl:${decoded.id}:${decoded.iat}`);
    if (blacklisted) {
      throw new Error("token_revoked");
    }
  } catch (error) {
    if ((error as Error).message === "token_revoked") throw error;
    // Redis unavailable — log and proceed; signature is still valid
    logger.warn("Token blacklist check unavailable, proceeding", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return decoded;
};
