import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { detectSuspiciousContent, logSecurityEvent, SecurityEventType } from '../../utils/securityAudit';
import { getSecurityContext, getUserId } from './request-context.interceptor';
import { logger } from '../../utils/logger';

@Injectable()
export class SecurityValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (process.env.check_add_sec === 'FALSE') return next.handle();

    const request = context.switchToHttp().getRequest();

    try {
      if (!['POST', 'PUT', 'PATCH'].includes(request.method)) return next.handle();
      if (!request.body || typeof request.body !== 'object') return next.handle();

      const suspiciousFields = detectSuspiciousContent(request.body);

      if (suspiciousFields.length > 0) {
        const securityContext = getSecurityContext(request);
        const userId = getUserId(request);

        suspiciousFields.forEach((suspicious: any) => {
          logSecurityEvent({
            type: SecurityEventType.VALIDATION_INJECTION_ATTEMPT,
            severity: 'high',
            context: securityContext,
            userId,
            details: {
              reason: suspicious.reason,
              endpoint: request.path,
              method: request.method,
              suspiciousField: suspicious.field,
            },
            sanitizedRequest: {
              body: { [suspicious.field]: '***REDACTED***' },
              headers: {
                'user-agent': request.get('user-agent'),
                'content-type': request.get('content-type'),
              },
            },
          });
        });

        logger.warn(`Security validation detected suspicious content in ${suspiciousFields.length} field(s)`, {
          endpoint: request.path,
          method: request.method,
          suspiciousFields: suspiciousFields.map((f: any) => f.field),
          requestId: getSecurityContext(request).requestId,
          userId,
        });
      }
    } catch (error) {
      logger.error('SecurityValidationInterceptor error', { error: (error as Error).message });
    }

    return next.handle();
  }
}
