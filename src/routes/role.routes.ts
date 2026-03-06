import { Router } from "express";
import roleHandlers from "../application/handlers/role/RolesHandler.js";
import { authenticate } from "../middleware/auth.js";
import { AdminAuthorize } from "../middleware/authorize.js";
import { validateRequest } from "../middleware/validate-request.js";
import { createRoleSchema, assignRoleSchema, IdParamSchema } from "../validators/validator.js";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware.js";
import { securityValidationMiddleware } from "../middleware/security-validation.middleware.js";


const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Role management routes - all protected with authentication and authorization
router.post(
  "/v1",
  AdminAuthorize(true),
  validateRequest(createRoleSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  roleHandlers.create
);

router.get(
  "/v1",
  AdminAuthorize(true),
  idempotencyMiddleware,
  securityValidationMiddleware,
  roleHandlers.getAll
);

router.get(
  "/v1/:id",
  AdminAuthorize(true),
  validateRequest(IdParamSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  roleHandlers.getById
);

router.put(
  "/v1/:id",
  AdminAuthorize(true),
  validateRequest(IdParamSchema),
  validateRequest(createRoleSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  roleHandlers.update
);

router.post(
  "/v1/:id/assign-responsibilities",
  AdminAuthorize(true),
  validateRequest(IdParamSchema),
  validateRequest(assignRoleSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  roleHandlers.assignResponsibilities
);

export default router;
