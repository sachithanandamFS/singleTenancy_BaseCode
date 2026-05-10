import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import crypto from 'crypto';
import { AppError } from '../../utils/appError';
import { errorCodes, IDEMPOTENCY_TTL_SECONDS } from '../../constants/constants';
import { RedisService } from '../../redis/redis.service';
import { getSecurityContext, getUserId } from './request-context.interceptor';
import { logger } from '../../utils/logger';
import { IDEMPOTENCY_KEY } from '../decorators/idempotency.decorator';

const IDEMPOTENCY_HEADER = 'idempotency-key';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (process.env.check_add_sec === 'FALSE') return next.handle();

    const hasIdempotency = this.reflector.getAllAndOverride<boolean>(IDEMPOTENCY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!hasIdempotency) return next.handle();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const headerValue: string | undefined = request.headers[IDEMPOTENCY_HEADER];

    if (!headerValue) {
      throw new AppError('idempotency_key_required', errorCodes.resBadResponse);
    }

    let redis: any;
    try {
      redis = this.redisService.getClient();
    } catch {
      throw new AppError('service_unavailable', errorCodes.resServUnavila);
    }

    const requestHash = this.hashPayload(request);
    const userId = getUserId(request);
    const scope = userId ? `user:${userId}` : `ip:${request.ip}`;
    const cacheKey = `idem:${scope}:${request.method}:${request.originalUrl}:${headerValue}`;

    const existing = await redis.get(cacheKey);
    if (existing) {
      const parsed = JSON.parse(existing) as { status: number; body: unknown; hash: string };
      if (parsed.hash !== requestHash) {
        throw new AppError('idempotency_key_conflict', errorCodes.resConflict);
      }
      response.setHeader('Idempotent-Replay', 'true');
      response.status(parsed.status).json(parsed.body);
      return new Observable(subscriber => subscriber.complete());
    }

    return next.handle().pipe(
      tap({
        next: async (body: unknown) => {
          if (response.statusCode < 400) {
            const payload = { status: response.statusCode, body, hash: requestHash };
            await redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(payload)).catch((err: Error) => {
              const ctx = getSecurityContext(request);
              logger.error('Failed to store idempotency response', {
                error: err.message,
                requestId: ctx.requestId,
              });
            });
          }
        },
      }),
    );
  }

  private hashPayload(req: any): string {
    const payload = { body: req.body ?? null, query: req.query ?? null, params: req.params ?? null };
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
