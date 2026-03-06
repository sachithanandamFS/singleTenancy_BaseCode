/**
 * Security Validation Middleware
 * Detects and logs injection attempts and suspicious content in requests
 * Runs after basic validation to check for attack patterns
 */

import { NextFunction, Request, Response } from "express";
import { detectSuspiciousContent, logSecurityEvent, SecurityEventType } from "../utils/securityAudit.js";
import { getSecurityContext, getUserId } from "../middleware/requestContext.middleware.js";
import { logger } from "../utils/logger.js";

/**
 * Check request body for suspicious content and log injection attempts
 * 
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
export const securityValidationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let check_add_sec = process.env.check_add_sec;
    if(check_add_sec == 'FALSE'){
        return next();
    } else {
        // Only validate POST/PUT/PATCH requests with body
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
        }

        if (!req.body || typeof req.body !== 'object') {
        return next();
        }

        // Check for suspicious content
        const suspiciousFields = detectSuspiciousContent(req.body);
        
        if (suspiciousFields.length > 0) {
        const securityContext = getSecurityContext(req);
        const userId = getUserId(req);
        
        // Log injection attempt for each suspicious field
        suspiciousFields.forEach((suspicious) => {
            logSecurityEvent({
            type: SecurityEventType.VALIDATION_INJECTION_ATTEMPT,
            severity: 'high',
            context: securityContext,
            userId: userId,
            details: {
                reason: suspicious.reason,
                endpoint: req.path,
                method: req.method,
                suspiciousField: suspicious.field,
            },
            sanitizedRequest: {
                body: {
                [suspicious.field]: '***REDACTED***'
                },
                headers: {
                'user-agent': req.get('user-agent'),
                'content-type': req.get('content-type'),
                }
            }
            });
        });

        logger.warn(`Security validation detected suspicious content in ${suspiciousFields.length} field(s)`, {
            endpoint: req.path,
            method: req.method,
            suspiciousFields: suspiciousFields.map(f => f.field),
            requestId: securityContext.requestId,
            userId: userId
        });
        }

        next();
    }
  } catch (error) {
    logger.error('Error in security validation middleware', {
      error: error instanceof Error ? error.message : String(error),
      endpoint: req.path,
      requestId: getSecurityContext(req).requestId
    });
    next();
  }
};
