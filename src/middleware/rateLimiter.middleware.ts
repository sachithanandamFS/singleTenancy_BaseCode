import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';
import { errorCodes, SupportedLanguages } from '../constants/constants.js';
import { getTranslation } from '../services/translation.js';

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 2 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // Limit each IP to max requests per windowMs
  message: 'too_many_requests',
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    const lang = (req as any).lang || SupportedLanguages.EN;
    const translated = getTranslation(options.message as string, lang) || 'Too many requests';
    res.status(errorCodes.resTooMany).json({
      success: false,
      message: translated
    });
  }
});