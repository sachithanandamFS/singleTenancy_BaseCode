import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../../utils/appError';
import { getTranslation } from '../../services/translation';
import { SupportedLanguages } from '../../constants/constants';
import { logger } from '../../utils/logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (res.headersSent) return;

    const lang: SupportedLanguages = (req as any).lang ?? SupportedLanguages.EN;

    if (exception instanceof AppError) {
      logger.error({
        status: exception.status,
        code: exception.statusCode,
        path: req.path,
        method: req.method,
        message: exception.message,
        ip: req.ip,
        validationErrors: exception.validationErrors,
      });

      const message = this.translateOrFallback(exception.message, lang, exception.message);

      res.status(exception.statusCode).json({
        success: false,
        message,
        data: null,
        ...(exception.validationErrors && { errors: exception.validationErrors }),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      const message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.message ?? 'An error occurred';

      res.status(status).json({
        success: false,
        message: Array.isArray(message) ? message.join(', ') : message,
        data: null,
      });
      return;
    }

    // Unknown error
    logger.error({
      message: (exception as Error)?.message,
      stack: (exception as Error)?.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    const message = this.translateOrFallback('some_wrong', lang, 'Something went wrong');

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      message,
    });
  }

  private translateOrFallback(key: string, lang: SupportedLanguages, fallback: string): string {
    try {
      return getTranslation(key, lang) || fallback;
    } catch {
      return fallback;
    }
  }
}
