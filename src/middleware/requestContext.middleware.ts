/**
 * Request Context Middleware
 * Generates unique requestId per request for correlation and tracing
 * Attaches to req and response headers with minimal overhead (~0.5ms)
 * 
 * Usage: Register early in middleware stack before routes
 * Impact: ~0.5-1ms per request for UUID generation + context attachment
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export interface SecurityContext {
  requestId: string;
  userId?: string | number;
  ip: string;
  timestamp: number;
  endpoint: string;
  method: string;
}

/**
 * Middleware to generate unique requestId and attach security context
 * Does NOT log on every request - only provides context for security events
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next middleware
 */
export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Generate unique requestId for request correlation
    const requestId = uuidv4();
    
    // req.ip is correct here because app.set('trust proxy', 1) is configured in index.ts,
    // so Express resolves the real client IP from X-Forwarded-For automatically.
    const ip = req.ip || 'unknown';
    
    // Attach to request object for downstream use
    (req as any).requestId = requestId;
    (req as any).securityContext = {
      requestId,
      ip,
      timestamp: Date.now(),
      endpoint: req.path,
      method: req.method,
    } as SecurityContext;

    // Attach to response headers for client-side correlation
    res.setHeader('X-Request-ID', requestId);

    next();
  } catch (error) {
    logger.error('Error in requestContext middleware', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    next(error);
  }
};

/**
 * Extract security context from request
 * Safe to call anytime; returns default if context not found
 * 
 * @param req - Express request
 * @returns SecurityContext with requestId and request metadata
 */
export const getSecurityContext = (req: Request): SecurityContext => {
  const existingContext = (req as any).securityContext;
  
  if (existingContext) {
    return existingContext;
  }

  // Fallback for requests that bypass middleware
  return {
    requestId: 'unknown',
    ip: req.ip || 'unknown',
    timestamp: Date.now(),
    endpoint: req.path,
    method: req.method,
  };
};

/**
 * Extract userId from request (set after authentication)
 * 
 * @param req - Express request
 * @returns userId if authenticated, undefined otherwise
 */
export const getUserId = (req: Request): string | number | undefined => {
  return (req as any).user?.id || (req as any).userId;
};
