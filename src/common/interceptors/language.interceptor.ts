import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SupportedLanguages, SUPPORTED_LANGUAGES } from '../../constants/constants';

@Injectable()
export class LanguageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const headerLang = this.normalize(request.headers['x-language']);
    const queryLang = this.normalize(request.query?.lang);
    const bodyLang = this.normalize(request.body?.lang);
    const acceptLang = request.acceptsLanguages(SUPPORTED_LANGUAGES);

    const requested = [headerLang, queryLang, bodyLang]
      .map(v => v?.toLowerCase())
      .find((v): v is SupportedLanguages =>
        v !== undefined && SUPPORTED_LANGUAGES.includes(v as SupportedLanguages),
      );

    const lang: SupportedLanguages = requested
      ? requested
      : typeof acceptLang === 'string' && SUPPORTED_LANGUAGES.includes(acceptLang as SupportedLanguages)
        ? (acceptLang as SupportedLanguages)
        : SupportedLanguages.EN;

    request.lang = lang;
    response.setHeader('Content-Language', lang);

    return next.handle();
  }

  private normalize(value: unknown): string | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
    return typeof value === 'string' ? value : undefined;
  }
}
