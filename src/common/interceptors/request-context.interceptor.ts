import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface SecurityContext {
  requestId: string;
  userId?: string | number;
  ip: string;
  timestamp: number;
  endpoint: string;
  method: string;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    try {
      const requestId = uuidv4();
      const ip = request.ip ?? 'unknown';

      request.requestId = requestId;
      request.securityContext = {
        requestId,
        ip,
        timestamp: Date.now(),
        endpoint: request.path,
        method: request.method,
      } as SecurityContext;

      response.setHeader('X-Request-ID', requestId);
    } catch (error) {
      logger.error('RequestContextInterceptor error', { error: (error as Error).message });
    }

    return next.handle();
  }
}

export function getSecurityContext(req: any): SecurityContext {
  return req.securityContext ?? {
    requestId: 'unknown',
    ip: req.ip ?? 'unknown',
    timestamp: Date.now(),
    endpoint: req.path,
    method: req.method,
  };
}

export function getUserId(req: any): string | number | undefined {
  return req.user?.id ?? req.userId;
}
