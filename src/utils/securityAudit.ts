/**
 * Security Audit Logger
 * Centralized logging for security anomalies and incidents
 * Only logs suspicious patterns - not every request
 * 
 * Severity levels:
 * - low: Suspicious but likely normal (e.g., 1 auth failure)
 * - medium: Concerning pattern (e.g., rate limit breach)
 * - high: Potential attack (e.g., unauthorized access, injection attempt)
 * - critical: Active incident requiring immediate attention (e.g., brute force, repeated violations)
 */

import { logger } from './logger.js';
import { SecurityContext } from '../middleware/requestContext.middleware.js';
import { getRedisClient } from '../config/redis.client.js';

/**
 * Security event types for anomaly tracking
 */
export enum SecurityEventType {
  // Authentication events
  AUTH_MISSING_TOKEN = 'auth_missing_token',
  AUTH_INVALID_TOKEN = 'auth_invalid_token',
  AUTH_FAILED_OTP = 'auth_failed_otp',
  AUTH_OTP_BRUTE_FORCE = 'auth_otp_brute_force',
  
  // Authorization events
  AUTHZ_UNAUTHORIZED_ACCESS = 'authz_unauthorized_access',
  AUTHZ_RESOURCE_NOT_FOUND = 'authz_resource_not_found',
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Validation events
  VALIDATION_MALFORMED_REQUEST = 'validation_malformed_request',
  VALIDATION_INJECTION_ATTEMPT = 'validation_injection_attempt',
  VALIDATION_FILE_VIOLATION = 'validation_file_violation',
  
  // Business logic events
  BUSINESS_DUPLICATE_ACCOUNT = 'business_duplicate_account',
  BUSINESS_INVALID_STATE = 'business_invalid_state',
  BUSINESS_RACE_CONDITION = 'business_race_condition',
  
  // Suspicious behavior events
  SUSPICIOUS_BULK_OPERATION = 'suspicious_bulk_operation',
  
  // Gateway events
  GATEWAY_REQUEST_FORWARDED = 'gateway_request_forwarded',
  GATEWAY_REQUEST_FAILED = 'gateway_request_failed',
  GATEWAY_CIRCUIT_OPEN = 'gateway_circuit_open',
  GATEWAY_CIRCUIT_CLOSED = 'gateway_circuit_closed',
  GATEWAY_TIMEOUT = 'gateway_timeout',
  GATEWAY_UNAUTHORIZED = 'gateway_unauthorized',
}

/**
 * Security event payload for structured logging
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: SecurityContext;
  userId?: string | number;
  details: {
    reason: string;
    endpoint: string;
    method: string;
    [key: string]: any; // Additional context-specific fields
  };
  sanitizedRequest?: {
    body?: any;
    params?: any;
    query?: any;
    headers?: {
      'content-type'?: string;
      'user-agent'?: string;
      [key: string]: any;
    };
  };
}

/**
 * Log security anomaly to security.log
 * 
 * Writes to separate security.log file with full context for incident reconstruction
 * For CRITICAL events, also logs to error.log for alerting
 * 
 * @param event - Security event to log
 * @example
 * logSecurityEvent({
 *   type: SecurityEventType.AUTH_FAILED_OTP,
 *   severity: 'medium',
 *   context: securityContext,
 *   userId: userId,
 *   details: {
 *     reason: 'Invalid OTP after 2 attempts',
 *     endpoint: '/api/auth/v1/verify-otp',
 *     method: 'POST',
 *     attempts: 2,
 *   },
 *   sanitizedRequest: {
 *     body: { phone_number: '***REDACTED***' },
 *     headers: { 'user-agent': 'Mobile/1.0' }
 *   }
 * })
 */
export const logSecurityEvent = (event: SecurityEvent): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId: event.context.requestId,
    eventType: event.type,
    severity: event.severity,
    userId: event.userId || 'anonymous',
    ip: event.context.ip,
    endpoint: event.details.endpoint,
    method: event.details.method,
    reason: event.details.reason,
    additionalContext: {
      ...event.details,
      endpoint: undefined, // Remove duplicates
      method: undefined,
      reason: undefined,
    },
    sanitizedRequest: event.sanitizedRequest,
  };

  // Log to security logger (separate transport)
  logger.warn(`[SECURITY] ${event.type.toUpperCase()} - ${event.severity}`, logEntry);

  // For CRITICAL events, also log to error stream for alerting
  if (event.severity === 'critical') {
    logger.error(`[SECURITY CRITICAL] ${event.type}`, logEntry);
    // TODO: In production, trigger alert to Slack, PagerDuty, etc.
  }
};

/**
 * Sanitize request data before logging
 * Redacts sensitive fields (OTP, passwords, tokens, PII)
 * 
 * @param body - Request body to sanitize
 * @returns Sanitized object with sensitive fields masked
 */
export const sanitizeRequestBody = (body: any): any => {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const sensitiveFields = [
    'otp',
    'password',
    'token',
    'access_token',
    'refresh_token',
    'phone_number',
    'email',
    'ssn',
    'credit_card',
    'cvv',
  ];

  const sanitized = { ...body };

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

/**
 * Sanitize request headers before logging
 * Keeps only non-sensitive headers
 * 
 * @param headers - Express request headers
 * @returns Sanitized headers object
 */
export const sanitizeHeaders = (headers: any): any => {
  if (!headers) return undefined;

  const allowedHeaders = [
    'content-type',
    'user-agent',
    'accept-language',
    'accept-encoding',
  ];

  const sanitized: any = {};

  allowedHeaders.forEach((header) => {
    if (headers[header]) {
      sanitized[header] = headers[header];
    }
  });

  return sanitized;
};

/**
 * Detect structural injection patterns in a string.
 * Only matches syntax that cannot appear in legitimate user input —
 * no SQL keyword matching (OR, AND, SELECT…) to avoid false positives on normal text.
 *
 * @param input - String to check
 * @returns true if an injection pattern is detected
 */
export const detectInjectionPattern = (input: string): boolean => {
  if (typeof input !== 'string') return false;

  const injectionPatterns = [
    // SQL comment / statement terminators — structural, never in normal field values
    /--|\/\*|\*\/|;/,
    // Stored procedure prefixes (xp_, sp_, dbo.) — structural
    /\bxp_|\bsp_|\bdbo\./i,
    // Script / event-handler injection
    /<script[\s>]/i,
    /javascript\s*:/i,
    /\bonerror\s*=/i,
    /\bonload\s*=/i,
  ];

  return injectionPatterns.some((pattern) => pattern.test(input));
};

/**
 * Check if request is suspicious based on content
 * Returns list of suspicious fields for logging
 * 
 * @param body - Request body
 * @returns Array of { field, reason } for suspicious fields
 */
export const detectSuspiciousContent = (body: any): Array<{ field: string; reason: string }> => {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const suspicious: Array<{ field: string; reason: string }> = [];

  Object.entries(body).forEach(([field, value]) => {
    if (typeof value === 'string') {
      if (detectInjectionPattern(value)) {
        suspicious.push({
          field,
          reason: 'Possible SQL/script injection pattern detected',
        });
      }

      // Check for excessively long strings (potential buffer overflow)
      if (value.length > 10000) {
        suspicious.push({
          field,
          reason: 'Excessively long string (>10KB)',
        });
      }
    }
  });

  return suspicious;
};

/**
 * Increment a security counter in Redis with a sliding TTL window.
 * Used to detect brute force or repeated attacks.
 * Fails silently if Redis is unavailable — auth flow is not blocked.
 *
 * @param key - Unique key for counting (e.g., "sec:login_fail:user@example.com")
 * @param ttlSeconds - Window duration; resets count after this many seconds of inactivity
 * @returns Current count, or 0 if Redis is unavailable
 */
export const incrementSecurityCounter = async (key: string, ttlSeconds: number = 900): Promise<number> => {
  try {
    const redis = getRedisClient();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  } catch (error) {
    logger.warn(`Security counter unavailable for key: ${key}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
};

/**
 * Check if a security counter has reached or exceeded a threshold.
 * Fails open (returns false) if Redis is unavailable — auth flow is not blocked.
 *
 * @param key - Unique key for counting
 * @param threshold - Max allowed count before escalation
 * @returns true if threshold exceeded, false if under threshold or Redis unavailable
 */
export const isSecurityThresholdExceeded = async (
  key: string,
  threshold: number
): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const count = await redis.get(key);
    return count !== null && parseInt(count, 10) >= threshold;
  } catch (error) {
    logger.warn(`Security threshold check unavailable for key: ${key}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

/**
 * Reset a security counter (e.g., after a successful login).
 * Fails silently if Redis is unavailable.
 *
 * @param key - Unique key to delete
 */
export const resetSecurityCounter = async (key: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (error) {
    logger.warn(`Security counter reset failed for key: ${key}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
