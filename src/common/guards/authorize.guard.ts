import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHORIZE_KEY, AuthorizeMetadata } from '../decorators/authorize.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppError } from '../../utils/appError';
import { errorCodes, Roles } from '../../constants/constants';
import { logger } from '../../utils/logger';

@Injectable()
export class AuthorizeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip on public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip when no @Authorize() decorator is present
    const meta = this.reflector.getAllAndOverride<AuthorizeMetadata>(AUTHORIZE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const { email, permissions, user_type } = request.user ?? {};

    if (!email) {
      logger.warn('AuthorizeGuard: no user email on request');
      throw new AppError('un_auth', errorCodes.resUnauth);
    }

    // SuperAdmin bypasses all permission checks
    if (user_type === Roles.SUPERADMIN) return true;

    if (!Array.isArray(permissions)) {
      throw new AppError('unauth', errorCodes.resUnauth);
    }

    const modulePermission = permissions.find((p: any) => p?.module_id === meta.mod_id);

    if (
      !modulePermission ||
      !Array.isArray(modulePermission.permitted_responsibilities) ||
      !modulePermission.permitted_responsibilities.includes(meta.respo_id)
    ) {
      throw new AppError('unauth', errorCodes.resUnauth);
    }

    return true;
  }
}
