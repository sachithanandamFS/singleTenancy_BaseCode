import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_SUPER_ADMIN_KEY } from '../decorators/admin.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppError } from '../../utils/appError';
import { errorCodes, Roles } from '../../constants/constants';
import { logger } from '../../utils/logger';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip on public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip entirely when no @Admin() decorator is present
    const requireSuperAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requireSuperAdmin === undefined || requireSuperAdmin === null) return true;

    const request = context.switchToHttp().getRequest();
    const userType = request.user?.user_type;

    if (userType === undefined || userType === null) {
      logger.warn('AdminGuard: no user_type on request');
      throw new AppError('un_auth', errorCodes.resUnauth);
    }

    const isAllowed = requireSuperAdmin
      ? userType === Roles.SUPERADMIN
      : userType === Roles.SUPERADMIN || userType === Roles.ADMIN;

    if (!isAllowed) {
      logger.warn('AdminGuard: insufficient role', { user_type: userType });
      throw new AppError('un_auth', errorCodes.resUnauth);
    }

    return true;
  }
}
