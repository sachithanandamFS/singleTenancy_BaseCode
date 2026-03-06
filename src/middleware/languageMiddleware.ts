import { Request, Response, NextFunction } from 'express';
import { SupportedLanguages, SUPPORTED_LANGUAGES } from '../constants/constants.js';

declare global {
  namespace Express {
    interface Request {
      lang: SupportedLanguages;
    }
  }
}

const normalizeLanguage = (value?: unknown): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

export const languageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const headerLang = normalizeLanguage(req.headers['x-language']);
  const queryLang = normalizeLanguage(req.query.lang);
  const bodyLang = normalizeLanguage((req.body as Record<string, unknown>)?.lang);
  const acceptLanguage = req.acceptsLanguages(SUPPORTED_LANGUAGES);

  const requested = [headerLang, queryLang, bodyLang]
    .map((value) => value?.toLowerCase())
    .find((value): value is SupportedLanguages =>
      value !== undefined && SUPPORTED_LANGUAGES.includes(value as SupportedLanguages)
    );

  const lang: SupportedLanguages = requested
    ? (requested as SupportedLanguages)
    : typeof acceptLanguage === 'string' && SUPPORTED_LANGUAGES.includes(acceptLanguage as SupportedLanguages)
    ? (acceptLanguage as SupportedLanguages)
    : SupportedLanguages.EN;

  req.lang = lang;
  res.setHeader('Content-Language', lang);
  next();
};
