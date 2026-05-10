import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SupportedLanguages } from '../../constants/constants';

export const Lang = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupportedLanguages => {
    const request = ctx.switchToHttp().getRequest();
    return request.lang ?? SupportedLanguages.EN;
  },
);
