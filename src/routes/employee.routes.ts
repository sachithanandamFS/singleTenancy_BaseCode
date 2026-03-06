import { Router } from "express";
import employeeHandlers from "../application/handlers/employee/EmployeeHandlers.js";
import {
  assignUserSchema,
  changePasswordSchema,
  createEmployeeSchema,
  empLoginSchema,
  empTokenSchema,
  IdParamSchema,
  updatedEmployeeSchema,
} from "../validators/validator.js";
import { validateRequest } from "../middleware/validate-request.js";
import { AdminAuthorize, authorizeEmployee } from "../middleware/authorize.js";
import { authenticate } from "../middleware/auth.js";
import { responsibilitiesID } from "../constants/Responsibilities.js";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware.js";
import { securityValidationMiddleware } from "../middleware/security-validation.middleware.js";

const router = Router();
const mod_id = responsibilitiesID.MManageEmployee;

router.post(
  "/v1/login",
  validateRequest(empLoginSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.loginEmployee
);

router.post(
  "/v1/validate-token",
  validateRequest(empTokenSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.validateToken
);

router.use(authenticate);

router.post(
  "/v1/logout",
  idempotencyMiddleware,
  employeeHandlers.logout
);

// all the below request must follow roles and responsibility authorization

// Since Super admin is created already, create employee request must be authorised and role checked before allowing to create a new user
router.post(
  "/v1",
  authorizeEmployee(mod_id, responsibilitiesID.ACreate),
  validateRequest(createEmployeeSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.createEmployee
);

router.get(
  "/v1",
  authorizeEmployee(mod_id, responsibilitiesID.AList),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.getAllEmployees
);

router.get(
  "/v1/all-users",
  AdminAuthorize(true),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.getAllEmployees
);

// To get all the responsibilities assigned to the user
router.get(
  "/v1/get-my-responsibilities",
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.getEmployeeRoles
);

// Change password endpoint - authenticated users can change their own password
router.put(
  "/v1/change-password",
  validateRequest(changePasswordSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.changePassword
);

router.get(
  "/v1/:id",
  authorizeEmployee(mod_id, responsibilitiesID.APreview),
  validateRequest(IdParamSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.getEmployeeById
);

router.put(
  "/v1/:id",
  authorizeEmployee(mod_id, responsibilitiesID.AEdit),
  validateRequest(IdParamSchema),
  validateRequest(updatedEmployeeSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.updateEmployee
);

// Change employee status
router.put(
  "/v1/:id/change-status",
  authorizeEmployee(mod_id, responsibilitiesID.AChangeStatus),
  validateRequest(IdParamSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.changeEmployeeStatus
);

router.post(
  "/v1/:id/assign-roles",
  AdminAuthorize(false),
  validateRequest(assignUserSchema),
  idempotencyMiddleware,
  securityValidationMiddleware,
  employeeHandlers.assignRoles
);

export default router;
