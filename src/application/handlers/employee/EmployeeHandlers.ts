/**
 * Employee Handlers (single-file, all operations)
 * Consolidates all employee operation handlers following BaseHandler pattern
 * Manages create, read, update, status change, login, token validation, roles, and role assignment
 */

import { Request, Response } from "express";
import { EmployeeRepository } from "../../../repositories/EmployeeRepository.js";
import { RoleRepository } from "../../../repositories/RoleRepository.js";
import { EmployeeDomainService } from "../../../domain/employee/EmployeeDomainService.js";
import { EmployeeEntity } from "../../../domain/employee/EmployeeEntity.js";
import { CreateEmployeeRequestDTO, UpdateEmployeeRequestDTO, EmployeeLoginRequestDTO, ValidateTokenRequestDTO, AssignRolesRequestDTO, ChangePasswordRequestDTO } from "../../dtos/employee/EmployeeRequestDTO.js";
import { errorCodes, Roles } from "../../../constants/constants.js";
import { handleSuccess } from "../../../middleware/errorHandler.middleware.js";
import { InputSanitizer } from "../shared/InputSanitizer.js";
import { AppError } from "../../../utils/appError.js";
import { BaseHandler } from "../shared/BaseHandler.js";
import { generateToken, blacklistToken } from "../../../utils/jwt.utils.js";
import { verifyWithProvider } from "../../../utils/auth.service.js";
import bcrypt from "bcrypt";
import { hashRoundsPass, LOGIN_MAX_ATTEMPTS, IP_LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_WINDOW_SECONDS, DUMMY_PASSWORD_HASH } from "../../../constants/constants.js";
import { incrementSecurityCounter, isSecurityThresholdExceeded, resetSecurityCounter } from "../../../utils/securityAudit.js";

/**
 * Consolidated Employee Handlers
 * All employee operations managed through unified error handling and logging
 */
class EmployeeHandlers extends BaseHandler {
  private readonly repository: EmployeeRepository;
  private readonly roleRepository: RoleRepository;
  private readonly domainService: EmployeeDomainService;

  constructor() {
    super();
    this.repository = new EmployeeRepository();
    this.roleRepository = new RoleRepository();
    this.domainService = new EmployeeDomainService();
  }

  /**
   * Create new employee
   */
  public createEmployee = this.wrapHandler(
    async (req: Request, res: Response) => {
      // Sanitize input data
      const sanitized = InputSanitizer.sanitize<CreateEmployeeRequestDTO>(req.body, {
        email: "string",
        password: "string",
        name: "string",
        phone: "string",
        user_type: "number",
      });

      const requestData: CreateEmployeeRequestDTO = sanitized;

      // Validate user type
      const userType = this.domainService.normalizeUserType(requestData.user_type);
      this.domainService.validatePhoneNumber(requestData.phone);

      // Validate email uniqueness (queries DB directly)
      await this.domainService.validateEmailUniqueness(requestData.email);

      // Create domain entity
      const employeeEntity = EmployeeEntity.create({
        email: requestData.email,
        name: requestData.name,
        phoneNumber: requestData.phone,
        userType: userType,
      });

      // Hash password
      const hashedPassword = await bcrypt.hash(requestData.password, hashRoundsPass);

      // Persist through repository
      await this.repository.save(employeeEntity, hashedPassword);

      handleSuccess(res, "employee_created", null, errorCodes.resCreated, req.lang);
    },
    "Error creating employee",
    (req) => ({ email: req.body?.email })
  );

  /**
   * Get all employees
   */
  public getAllEmployees = this.wrapHandler(
    async (req: Request, res: Response) => {
      const isAdmin = req.user?.user_type === Roles.ADMIN || req.user?.user_type === Roles.SUPERADMIN;
      const employees = await this.repository.findAll({ isAdmin });

      // Convert domain entities to DTOs
      const employeesDTO = employees.map((emp) => emp.toDTO());

      handleSuccess(res, "user_found", employeesDTO, errorCodes.resOk, req.lang);
    },
    "Error fetching employees"
  );

  /**
   * Get employee by ID
   */
  public getEmployeeById = this.wrapHandler(
    async (req: Request, res: Response) => {
      const employeeId = Number(req.params.id);

      const employee = await this.repository.findByIdWithRoles(employeeId);
      if (!employee) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      handleSuccess(res, "user_found", employee, errorCodes.resOk, req.lang);
    },
    "Error fetching employee",
    (req) => ({ employeeId: req.params?.id })
  );

  /**
   * Update employee
   */
  public updateEmployee = this.wrapHandler(
    async (req: Request, res: Response) => {
      const employeeId = Number(req.params.id);

      // Sanitize input data
      const sanitized = InputSanitizer.sanitize<UpdateEmployeeRequestDTO>(req.body, {
        email: "string",
        name: "string",
        phone: "string",
        user_type: "number",
      });

      const requestData: UpdateEmployeeRequestDTO = sanitized;

      // Find existing employee
      const existingEmployee = await this.repository.findById(employeeId);
      if (!existingEmployee) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Validate email uniqueness if being updated (queries DB directly)
      if (requestData.email) {
        await this.domainService.validateEmailUniquenessForUpdate(employeeId, requestData.email);
      }

      // Validate phone if provided
      if (requestData.phone) {
        this.domainService.validatePhoneNumber(requestData.phone);
      }

      // Validate user type if provided
      if (requestData.user_type !== undefined) {
        const userType = this.domainService.normalizeUserType(requestData.user_type);
        requestData.user_type = userType;
      }

      // Update domain entity
      const updatedEmployee = existingEmployee.update({
        email: requestData.email,
        name: requestData.name,
        phoneNumber: requestData.phone,
        userType: requestData.user_type,
      });

      // Persist through repository
      const savedEmployee = await this.repository.update(updatedEmployee);

      handleSuccess(res, "employee_updated", null, errorCodes.resOk, req.lang);
    },
    "Error updating employee",
    (req) => ({ employeeId: req.params?.id, email: req.body?.email })
  );

  /**
   * Change employee status (toggle active/inactive)
   */
  public changeEmployeeStatus = this.wrapHandler(
    async (req: Request, res: Response) => {
      const employeeId = Number(req.params.id);

      const employee = await this.repository.findById(employeeId);
      if (!employee) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Toggle status
      const newStatus = !employee.getIsActive();
      await this.repository.updateStatus(employeeId, newStatus);

      handleSuccess(res, "employee_status_changed", null, errorCodes.resOk, req.lang);
    },
    "Error changing employee status",
    (req) => ({ employeeId: req.params?.id })
  );

  /**
   * Employee login
   */
  public loginEmployee = this.wrapHandler(
    async (req: Request, res: Response) => {
      // Disable local login when an external auth provider is active
      if (process.env.use_auth0 === "TRUE" || process.env.use_sso === "TRUE") {
        throw new AppError("auth_provider_external", errorCodes.resBadResponse);
      }

      // Sanitize input
      const sanitized = InputSanitizer.sanitize<EmployeeLoginRequestDTO>(req.body, {
        email: "string",
        password: "string",
      });

      const { email, password } = sanitized;

      const emailKey = `sec:login_fail:${email}`;
      const ipKey = `sec:login_fail_ip:${req.ip}`;

      // Block before any DB work — check both per-email and per-IP lockouts
      const [emailLocked, ipLocked] = await Promise.all([
        isSecurityThresholdExceeded(emailKey, LOGIN_MAX_ATTEMPTS),
        isSecurityThresholdExceeded(ipKey, IP_LOGIN_MAX_ATTEMPTS),
      ]);
      if (emailLocked || ipLocked) {
        throw new AppError("account_locked", errorCodes.resTooMany);
      }

      const incrementBoth = () => Promise.all([
        incrementSecurityCounter(emailKey, LOGIN_LOCKOUT_WINDOW_SECONDS),
        incrementSecurityCounter(ipKey, LOGIN_LOCKOUT_WINDOW_SECONDS),
      ]);

      // Find employee by email
      const employee = await this.repository.findByEmail(email);
      if (!employee) {
        // Dummy compare to equalize response time with the wrong-password path (timing attack prevention)
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        await incrementBoth();
        throw new AppError("invalid_credentials", errorCodes.resUnauth);
      }

      // Verify password
      const employeeId = employee.getId();
      if (!employeeId) {
        await incrementBoth();
        throw new AppError("invalid_credentials", errorCodes.resUnauth);
      }

      const passwordHash = await this.repository.getPasswordHash(employeeId);
      if (!passwordHash) {
        await incrementBoth();
        throw new AppError("invalid_credentials", errorCodes.resUnauth);
      }

      const isValidPassword = await bcrypt.compare(password, passwordHash);
      if (!isValidPassword) {
        await incrementBoth();
        throw new AppError("invalid_credentials", errorCodes.resUnauth);
      }

      // Success — reset per-email counter; IP counter expires naturally
      await resetSecurityCounter(emailKey);

      // Get responsibilities to build JWT permissions (don't fetch labels for JWT)
      const responsibilities = (await this.roleRepository.getResponsibilitiesForUserOrAdmin(
        employeeId,
        employee.getUserType(),
        false
      )) as Array<{ module_id: number; permitted_responsibilities: number[] }>;

      // Generate JWT token
      const token = generateToken({
        id: employeeId,
        email: employee.getEmail(),
        user_type: employee.getUserType(),
        name: employee.getName(),
        permissions: responsibilities,
      });

      handleSuccess(
        res,
        "login_success",
        { token, user_type: employee.getUserType() },
        errorCodes.resOk,
        req.lang
      );
    },
    "Error in employee login",
    (req) => ({ email: req.body?.email })
  );

  /**
   * Validate employee token
   */
  public validateToken = this.wrapHandler(
    async (req: Request, res: Response) => {
      // Sanitize input
      const sanitized = InputSanitizer.sanitize<ValidateTokenRequestDTO>(req.body, {
        token: "string",
      });

      const { token } = sanitized;

      try {
        const decoded = await verifyWithProvider(token);
        const tokenData = {
          email: decoded.email,
          name: decoded.name,
          user_type: decoded.user_type,
        };
        handleSuccess(res, "token_valid", tokenData, errorCodes.resOk, req.lang);
      } catch (error) {
        throw new AppError("invalid_token", errorCodes.resUnauth);
      }
    },
    "Error validating employee token",
    (req) => ({ hasToken: Boolean(req.body?.token) })
  );

  /**
   * Get employee roles/responsibilities
   */
  public getEmployeeRoles = this.wrapHandler(
    async (req: Request, res: Response) => {
      // For the /get-my-responsibilities endpoint, we should use the logged-in user's ID
      const employeeId = req.user?.id || Number(req.params.id);

      if (!employeeId) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Verify employee exists
      const employee = await this.repository.findById(employeeId);
      if (!employee) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Get roles with enriched labels
      const roles = await this.roleRepository.getResponsibilitiesForUserOrAdmin(employeeId, employee.getUserType(), true);

      handleSuccess(res, "user_roles_found", { responsibilities: roles }, errorCodes.resOk, req.lang);
    },
    "Error fetching employee roles",
    (req) => ({ employeeId: req.params?.id })
  );

  /**
   * Assign roles to employee
   */
  public assignRoles = this.wrapHandler(
    async (req: Request, res: Response) => {
      const employeeId = Number(req.params.id);

      // Verify employee exists
      const employee = await this.repository.findById(employeeId);
      if (!employee) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Validate role IDs are array of numbers
      const roleIds = req.body.r_role_ids;
      if (!Array.isArray(roleIds) || !roleIds.every((id) => typeof id === "number" && Number.isFinite(id))) {
        throw new AppError("invalid_role_ids", errorCodes.resBadResponse);
      }

      // Assign roles using repository
      await this.repository.assignRoles(employeeId, roleIds);

      handleSuccess(res, "roles_assigned", null, errorCodes.resOk, req.lang);
    },
    "Error assigning roles to employee",
    (req) => ({
      employeeId: req.params?.id,
      roleCount: Array.isArray(req.body?.r_role_ids) ? req.body?.r_role_ids.length : 0,
    })
  );

  /**
   * Logout — blacklist the current JWT so it cannot be reused
   * Only applies to local JWT; Auth0/SSO revocation is handled by the provider
   */
  public logout = this.wrapHandler(
    async (req: Request, res: Response) => {
      if (process.env.use_auth0 !== "TRUE" && process.env.use_sso !== "TRUE") {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          await blacklistToken(authHeader.split(" ")[1]);
        }
      }
      handleSuccess(res, "logout_success", null, errorCodes.resOk, req.lang);
    },
    "Error during logout",
    (req) => ({ employeeId: req.user?.id })
  );

  /**
   * Change employee password
   */
  public changePassword = this.wrapHandler(
    async (req: Request, res: Response) => {
      // Get employee ID from authenticated user
      const employeeId = req.user?.id;
      if (!employeeId) {
        throw new AppError("unauth", errorCodes.resUnauth);
      }

      // Sanitize input
      const sanitized = InputSanitizer.sanitize<ChangePasswordRequestDTO>(req.body, {
        old_password: "string",
        new_password: "string",
      });

      const { old_password, new_password } = sanitized;

      // Verify employee exists
      const employee = await this.repository.findById(employeeId);
      if (!employee) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Get current password hash
      const currentPasswordHash = await this.repository.getPasswordHash(employeeId);
      if (!currentPasswordHash) {
        throw new AppError("user_404", errorCodes.resNotFound);
      }

      // Validate old password
      const isOldPasswordValid = await bcrypt.compare(old_password, currentPasswordHash);
      if (!isOldPasswordValid) {
        throw new AppError("incorrect_old_password", errorCodes.resUnauth);
      }

      // Check that new password is different from old password
      const isSamePassword = await bcrypt.compare(new_password, currentPasswordHash);
      if (isSamePassword) {
        throw new AppError("password_same_as_old", errorCodes.resBadResponse);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, hashRoundsPass);

      // Update password in repository
      await this.repository.updatePassword(employeeId, newPasswordHash);

      // Invalidate the current token so it cannot be reused after a password change.
      // Only applies to local JWT — Auth0 and SSO providers manage token revocation on their own side.
      if (process.env.use_auth0 !== "TRUE" && process.env.use_sso !== "TRUE") {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          await blacklistToken(authHeader.split(" ")[1]);
        }
      }

      handleSuccess(res, "password_changed", null, errorCodes.resOk, req.lang);
    },
    "Error changing password",
    (req) => ({ employeeId: req.user?.id })
  );
}

export default new EmployeeHandlers();
