import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { getTranslation } from "../services/translation.js";
import { errorCodes, SupportedLanguages } from "../constants/constants.js";
import { AppError } from "../utils/appError.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  const lang = req.lang || SupportedLanguages.EN;

  return err instanceof AppError
    ? handleOperationalError(err, req, res, lang)
    : handleGenericError(err, req, res, lang);
};

const handleOperationalError = (
  err: AppError,
  req: Request,
  res: Response,
  lang: SupportedLanguages
) => {
  logger.error({
    status: err.status,
    code: err.statusCode,
    path: req.path,
    method: req.method,
    message: err.message,
    ip: req.ip,
    validationErrors: err.validationErrors,
  });

  const translationKey = err.message;
  const translatedMessage = translateOrFallback(
    translationKey,
    lang,
    err.message
  );

  res.status(err.statusCode).json({
    success: false,
    message: translatedMessage,
    data: null,
    ...(err.validationErrors && { errors: err.validationErrors }),
  });
};

const handleGenericError = (
  err: Error,
  req: Request,
  res: Response,
  lang: SupportedLanguages
) => {

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  const translationKey = "some_wrong";
  const translatedMessage = translateOrFallback(
    translationKey,
    lang,
    err.message
  );

  res.status(errorCodes.resIntError).json({
    success: false,
    data: null,
    message: translatedMessage,
  });
};

export const handleSuccess = (
  res: Response,
  message: string,
  result: any,
  successCode: number,
  lang: SupportedLanguages
) => {
  const translatedMessage = translateOrFallback(
    message,
    lang,
    "Operation Success"
  );

  res.status(successCode).json({
    success: true,
    data: result || null,
    message: translatedMessage,
  });
};

const translateOrFallback = (
  key: string,
  lang: SupportedLanguages,
  fallback: string
) => {
  try {
    return getTranslation(key, lang) || fallback;
  } catch (error) {
    logger.warn("Translation lookup failed", {
      key,
      lang,
      error: (error as Error)?.message,
    });
    return fallback;
  }
};
