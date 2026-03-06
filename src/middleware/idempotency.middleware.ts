/**
 * Idempotency Middleware
 * Ensures write endpoints can be safely retried with the same Idempotency-Key.
 */

import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { AppError } from "../utils/appError.js";
import { errorCodes, IDEMPOTENCY_TTL_SECONDS } from "../constants/constants.js";
import { getRedisClient } from "../config/redis.client.js";
import { logger } from "../utils/logger.js";
import { getSecurityContext, getUserId } from "./requestContext.middleware.js";

const IDEMPOTENCY_HEADER = "idempotency-key";

const hashPayload = (req: Request): string => {
  const payload = {
    body: req.body ?? null,
    query: req.query ?? null,
    params: req.params ?? null,
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
};

const buildIdempotencyKey = (req: Request, key: string): string => {
  const userId = getUserId(req);
  const scope = userId ? `user:${userId}` : `ip:${req.ip}`;
  return `idem:${scope}:${req.method}:${req.originalUrl}:${key}`;
};

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let check_add_sec = process.env.check_add_sec;
    if(check_add_sec == 'TRUE'){
        const headerValue = req.headers[IDEMPOTENCY_HEADER] as string | undefined;
        if (!headerValue) {
        return next(
            new AppError(
            "idempotency_key_required",
            errorCodes.resBadResponse
            )
        );
        }

        let redis;
        try {
        redis = getRedisClient();
        } catch (error) {
        logger.error("Idempotency middleware requires Redis", {
            error: error instanceof Error ? error.message : String(error),
        });
        return next(
            new AppError("service_unavailable", errorCodes.resServUnavila)
        );
        }

        const requestHash = hashPayload(req);
        const cacheKey = buildIdempotencyKey(req, headerValue);

        const existing = await redis.get(cacheKey);
        if (existing) {
        const parsed = JSON.parse(existing) as {
            status: number;
            body: unknown;
            hash: string;
        };

        if (parsed.hash !== requestHash) {
            return next(
            new AppError(
                "idempotency_key_conflict",
                errorCodes.resConflict
            )
            );
        }

        res.setHeader("Idempotent-Replay", "true");
        res.status(parsed.status).json(parsed.body);
        return;
        }

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const storeResponse = async (body: unknown) => {
        if (res.statusCode >= 400) {
            return;
        }

        const payload = {
            status: res.statusCode,
            body,
            hash: requestHash,
        };

        await redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(payload));
        };

        res.json = ((body: unknown) => {
        storeResponse(body).catch((error) => {
            const context = getSecurityContext(req);
            logger.error("Failed to store idempotency response", {
            error: error instanceof Error ? error.message : String(error),
            requestId: context.requestId,
            endpoint: context.endpoint,
            });
        });
        return originalJson(body);
        }) as Response["json"];

        res.send = ((body: unknown) => {
        storeResponse(body).catch((error) => {
            const context = getSecurityContext(req);
            logger.error("Failed to store idempotency response", {
            error: error instanceof Error ? error.message : String(error),
            requestId: context.requestId,
            endpoint: context.endpoint,
            });
        });
        return originalSend(body);
        }) as Response["send"];
        return next();
    } else {
        return next();
    }
    
  } catch (error) {
    return next(error);
  }
};
