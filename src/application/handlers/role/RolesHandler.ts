import { Request, Response, NextFunction } from "express";
import { RoleRepository } from "../../../repositories/RoleRepository.js";
import { RoleDomainService } from "../../../domain/role/RoleDomainService.js";
import { RoleEntity } from "../../../domain/role/RoleEntity.js";
import {
  CreateRoleRequestDTO,
  UpdateRoleRequestDTO,
  AssignResponsibilitiesRequestDTO,
} from "../../dtos/role/RoleRequestDTO.js";
import { AppError } from "../../../utils/appError.js";
import { errorCodes } from "../../../constants/constants.js";
import { handleSuccess } from "../../../middleware/errorHandler.middleware.js";
import { InputSanitizer } from "../shared/InputSanitizer.js";
import { BaseHandler } from "../shared/BaseHandler.js";

/**
 * Role Handlers (single-file, all operations)
 * Centralizes role create/read/update/assign flows to avoid handler sprawl.
 */
class RoleHandlers extends BaseHandler {
  private readonly repository = new RoleRepository();
  private readonly domainService = new RoleDomainService();

  /** Create role */
  public create = this.wrapHandler(
    async (req, res) => {
      // Sanitize input data
      const sanitized = InputSanitizer.sanitize<CreateRoleRequestDTO>(req.body, {
        r_name: "string",
        r_desc: "string",
      });

      const requestData: CreateRoleRequestDTO = sanitized;

      // Validate uniqueness using domain service (queries DB directly)
      await this.domainService.validateUniqueness(
        { roleName: requestData.r_name }
      );

      // Create domain entity
      const roleEntity = RoleEntity.create({
        roleName: requestData.r_name,
        description: requestData.r_desc,
      });

      // Persist through repository
      await this.repository.save(roleEntity);

      handleSuccess(res, "role_created", null, errorCodes.resCreated, req.lang);
    },
    "Error in role creation",
    (req) => ({ name: req.body?.r_name })
  );

  /** Get all roles */
  public getAll = this.wrapHandler(
    async (req, res) => {
      const roles = await this.repository.findAll();

      // Convert domain entities to DTOs
      const rolesDTO = roles.map((role) => role.toDTO());

      handleSuccess(res, "role_fetched", rolesDTO, errorCodes.resOk, req.lang);
    },
    "Error fetching roles"
  );

  /** Get role by ID */
  public getById = this.wrapHandler(
    async (req, res) => {
      const roleId = Number(req.params.id);

      const role = await this.repository.findByIdWithResponsibilities(roleId);

      handleSuccess(res, "role_fetched", role, errorCodes.resOk, req.lang);
    },
    "Error fetching role",
    (req) => ({ roleId: req.params?.id })
  );

  /** Update role */
  public update = this.wrapHandler(
    async (req, res) => {
      const roleId = Number(req.params.id);

      // Sanitize input data
      const sanitized = InputSanitizer.sanitize<UpdateRoleRequestDTO>(req.body, {
        r_name: "string",
        r_desc: "string",
      });

      const requestData: UpdateRoleRequestDTO = sanitized;

      // Find existing role
      const existingRole = await this.repository.findById(roleId);
      if (!existingRole) {
        throw new AppError("role_404", errorCodes.resNotFound);
      }

      // Validate uniqueness if name is being updated (queries DB directly)
      if (requestData.r_name) {
        await this.domainService.validateUniquenessForUpdate(
          roleId,
          { roleName: requestData.r_name }
        );
      }

      // Update domain entity
      const updatedRole = existingRole.update({
        roleName: requestData.r_name,
        description: requestData.r_desc,
      });

      // Persist through repository
      await this.repository.update(updatedRole);

      handleSuccess(
        res,
        "role_updated",
        null,
        errorCodes.resOk,
        req.lang
      );
    },
    "Error updating role",
    (req) => ({ roleId: req.params?.id })
  );

  /** Assign responsibilities to role */
  public assignResponsibilities = this.wrapHandler(
    async (req, res) => {
      const roleId = Number(req.params.id);
      const requestData: AssignResponsibilitiesRequestDTO = req.body;

      // Check if role exists
      const role = await this.repository.findById(roleId);
      if (!role) {
        throw new AppError("role_404", errorCodes.resNotFound);
      }

      // Sanitize permissions using utility
      const sanitizedPermissions = InputSanitizer.sanitizePermissions(
        requestData.permissions
      );

      if (!sanitizedPermissions.length) {
        throw new AppError("invalid_permissions", errorCodes.resBadResponse);
      }

      // Assign responsibilities through repository
      await this.repository.assignResponsibilities(roleId, sanitizedPermissions);

      handleSuccess(res, "role_assigned", null, errorCodes.resOk, req.lang);
    },
    "Error assigning responsibilities to role",
    (req) => ({ roleId: req.params?.id, count: req.body?.permissions?.length })
  );
}

export default new RoleHandlers();
