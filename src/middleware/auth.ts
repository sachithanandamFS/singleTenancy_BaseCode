import { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger.js"
import { AppError } from "../utils/appError.js"
import { errorCodes } from "../constants/constants.js";
import { JwtUserPayload } from "../utils/jwt.utils.js";
import { verifyWithProvider } from "../utils/auth.service.js";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next(new AppError('no_token', errorCodes.resUnauth));
      return
    }

    const token = authHeader.split(" ")[1]
    const decoded = await verifyWithProvider(token) as JwtUserPayload;

    req.user = decoded;
    next();
  } catch (error: any) {
    logger.error("Authentication error", {
      error: error.message,
      stack: error.stack,
    });
    next(new AppError("un_auth", errorCodes.resUnauth))
  }
}
