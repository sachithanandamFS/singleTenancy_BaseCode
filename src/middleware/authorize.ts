import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/appError.js";
import { errorCodes, Roles } from "../constants/constants.js";
// Legacy employee.service removed from admin check; rely on JWT user context

export const AdminAuthorize = (requireSuperAdmin: boolean) => {
  return async (req: Request, res: Response, next: NextFunction) => {

    try {
      const userType = req.user?.user_type;
      if (userType === undefined || userType === null) {
        logger.warn("No user type found in request");
        next(new AppError("un_auth", errorCodes.resUnauth));
        return;
      }

      const isAllowed = requireSuperAdmin
        ? userType === Roles.SUPERADMIN
        : userType === Roles.SUPERADMIN || userType === Roles.ADMIN;

      if (!isAllowed) {
        logger.warn("Not an admin", { user_type: userType });
        next(new AppError("un_auth", errorCodes.resUnauth));
        return;
      }
      
      next();
    } catch (error: any) {
      logger.error("Authorization error", {
        error: error.message,
        stack: error.stack,
        path: req.path,
      });
      next(new AppError("un_auth", errorCodes.resUnauth));
    }
  };
};

export const authorizeEmployee = (mod_id: number, respo_id: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, permissions, user_type, id } = req.user ?? {};

      if (!email) {
        logger.warn("No user email found in request");
        next(new AppError("un_auth", errorCodes.resUnauth));
        return;
      }

      if (user_type === Roles.SUPERADMIN) {
        next();
        return;
      }

      // Check if permissions is an array of objects with module_id and permitted_responsibilities
      if (!Array.isArray(permissions)) {
        throw new AppError("unauth", errorCodes.resUnauth);
      }

      const modulePermission = permissions.find(
        (perm: any) => perm?.module_id === mod_id
      ) as any;

      if (
        !modulePermission ||
        !Array.isArray(modulePermission?.permitted_responsibilities) ||
        !modulePermission?.permitted_responsibilities.includes(respo_id)
      ) {
        throw new AppError("unauth", errorCodes.resUnauth);
      }

      next();
    } catch (error: any) {
      logger.error("Authorization error", {
        error: error.message,
        stack: error.stack,
        path: req.path,
      });
      next(new AppError("un_auth", errorCodes.resUnauth));
    }
  };
};
