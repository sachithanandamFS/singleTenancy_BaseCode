import { Request, Response, NextFunction } from "express";
import { logger } from "../../../utils/logger.js";
import { AppError } from "../../../utils/appError.js";

/**
 * Base Handler Class
 * Provides common functionality for all handlers
 * Eliminates duplicate wrapHandler implementations across modules
 */
export abstract class BaseHandler {
  
  /**
   * Wraps handler methods to ensure proper error handling with logging context
   * @param handler The async handler function to execute
   * @param context Error context for logging (e.g., "Error creating role")
   * @param extraMeta Optional function to extract additional metadata from request
   */
  protected wrapHandler(
    handler: (req: Request, res: Response) => Promise<void>,
    context: string,
    extraMeta?: (req: Request) => Record<string, unknown>
  ) {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        await handler(req, res);
      } catch (error: any) {
        logger.error(context, {
          error: error?.message,
          stack: error?.stack,
          ...(extraMeta ? extraMeta(req) : {}),
        });
        next(error instanceof AppError ? error : error);
      }
    };
  }
}
