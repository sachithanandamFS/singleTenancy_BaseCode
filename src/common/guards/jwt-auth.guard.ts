import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppError } from '../../utils/appError';
import { errorCodes } from '../../constants/constants';
import { verifyWithProvider } from '../../utils/auth.service';
import { JwtUserPayload } from '../../utils/jwt.utils';
import { logger } from '../../utils/logger';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('no_token', errorCodes.resUnauth);
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = await verifyWithProvider(token) as JwtUserPayload;
      request.user = decoded;
      return true;
    } catch (error: any) {
      logger.error('Authentication error', { error: error.message });
      throw new AppError('un_auth', errorCodes.resUnauth);
    }
  }
}
