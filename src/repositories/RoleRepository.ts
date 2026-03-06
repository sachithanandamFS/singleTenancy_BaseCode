import { col, fn, where, Transaction } from "sequelize";
import { IRoleRepository } from "./IRoleRepository.js";

import { RoleEntity } from "../domain/role/RoleEntity.js";
import Role from "../models/role.model.js";
import { RoleResponsibility } from "../models/associations.js";
import { sequelize } from "../db/config.js";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import UserRole from "../models/user-role.model.js";
import { Roles } from "../constants/constants.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Sequelize implementation of Role Repository
 * Handles all data access operations for roles
 */
export class RoleRepository implements IRoleRepository {
  private moduleDetails: any;

  constructor() {
    // Load module details on initialization
    const moduleDetailsPath = join(__dirname, "../../resources/ModuleDetails.json");
    this.moduleDetails = JSON.parse(readFileSync(moduleDetailsPath, "utf-8"));
  }

  /**
   * Map Sequelize model to Domain Entity
   */
  private toDomain(model: Role): RoleEntity {
    return RoleEntity.reconstitute({
      id: Number(model.id),
      roleName: model.r_name,
      description: model.r_description,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  /**
   * Map multiple models to entities
   */
  private toDomainList(models: Role[]): RoleEntity[] {
    return models.map((model) => this.toDomain(model));
  }

  public async save(role: RoleEntity, transaction?: Transaction) {
    const data = role.toPersistence();
    await Role.create(data as any, { transaction });
    return null;
  }

  public async update(role: RoleEntity, transaction?: Transaction) {
    const id = role.getId();
    if (!id) {
      throw new Error("Cannot update role without ID");
    }

    const data = role.toPersistence();
    await Role.update(data, { where: { id: Number(id) }, transaction });

    return null;
  }

  public async findById(id: number): Promise<RoleEntity | null> {
    const model = await Role.findByPk(id);
    return model ? this.toDomain(model) : null;
  }

  public async findAll(): Promise<RoleEntity[]> {
    const models = await Role.findAll({
      order: [["r_name", "ASC"]],
    });
    return this.toDomainList(models);
  }

  public async existsByName(
    name: string,
    excludeId?: number
  ): Promise<boolean> {
    const whereCondition: any = where(fn("LOWER", col("r_name")), name.toLowerCase());

    const model = await Role.findOne({
      where: whereCondition,
    });

    if (!model) return false;
    if (excludeId && Number(model.id) === excludeId) return false;

    return true;
  }

  public async assignResponsibilities(
    roleId: number,
    permissions: Array<{ module_id: number; resp_ids: number[] }>
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Delete all existing role permissions
      await RoleResponsibility.destroy({
        where: { role_id: roleId },
        transaction,
      });

      // Create new role permissions from request body
      const newPermissions = permissions.flatMap((perm) =>
        perm.resp_ids.map((resp_id) => ({
          role_id: roleId,
          mod_id: perm.module_id,
          resp_id,
        }))
      );

      // Create permissions individually (composite primary key)
      for (const permission of newPermissions) {
        await RoleResponsibility.create(permission, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async findByIdWithResponsibilities(id: number): Promise<any> {
    const role = await Role.findByPk(id);
    if (!role) {
      return null;
    }

    // Fetch assigned responsibilities for this role
    const roleResponsibilities = await RoleResponsibility.findAll({
      where: { role_id: id },
      attributes: ["mod_id", "resp_id"],
      raw: true,
    });

    // Group responsibilities by module
    const moduleResponsibilityMap = new Map<number, number[]>();
    roleResponsibilities.forEach((rr: any) => {
      const modId = Number(rr.mod_id);
      const respId = Number(rr.resp_id);
      
      if (!moduleResponsibilityMap.has(modId)) {
        moduleResponsibilityMap.set(modId, []);
      }
      moduleResponsibilityMap.get(modId)!.push(respId);
    });

    // Create maps for quick lookup
    const moduleMap = new Map(
      this.moduleDetails.modules.map((m: any) => [m.id, m.label])
    );
    const responsibilityMap = new Map(
      this.moduleDetails.responsibilities.map((r: any) => [r.id, r.label])
    );

    // Enrich permissions with labels
    const permissions = Array.from(moduleResponsibilityMap.entries()).map(
      ([moduleId, respIds]) => ({
        module_id: moduleId,
        module_label: moduleMap.get(moduleId) || "Unknown Module",
        responsibilities: respIds.map((respId) => {
          // Ensure respId is a number for consistent Map lookup
          const respIdNum = Number(respId);
          return {
            id: respIdNum,
            label: responsibilityMap.get(respIdNum) || "Unknown Responsibility",
          };
        }),
      })
    );

    return {
      ...role.toJSON(),
      permissions,
    };
  }

  /**
   * Get responsibilities for user grouped by module
   * Returns raw responsibility IDs or enriched with labels
   */
  public async getResponsibilitiesForUser(
    userId: number,
    withLabels: boolean = false
  ): Promise<Array<{ module_id: number; permitted_responsibilities: number[] }> | Array<{ module_id: number; module_label: string; responsibilities: Array<{ id: number; label: string }> }>> {
    try {
      // Fetch role IDs assigned to user
      const roleIds = await UserRole.findAll({
        where: { user_id: userId },
        attributes: ["role_id"],
        raw: true,
      });

      const roleIdArray = roleIds.map((r) => r.role_id);

      if (!roleIdArray.length) {
        logger.warn(`No roles assigned to user ${userId}`);
        return [];
      }

      // Fetch responsibilities for those roles
      const responsibilities = await RoleResponsibility.findAll({
        where: {
          role_id: roleIdArray,
        },
        attributes: ["mod_id", "resp_id"],
        raw: true,
      });

      if (!responsibilities.length) {
        logger.warn(`No responsibilities found for user ${userId} roles`);
        return [];
      }

      // Group responsibilities by module_id
      const groupedByModule = responsibilities.reduce(
        (acc, item: any) => {
          const moduleId = Number(item.mod_id);
          const respId = Number(item.resp_id);

          if (!acc[moduleId]) {
            acc[moduleId] = [];
          }

          if (!acc[moduleId].includes(respId)) {
            acc[moduleId].push(respId);
          }

          return acc;
        },
        {} as Record<number, number[]>
      );

      // Convert to array format
      const result = Object.entries(groupedByModule).map(([moduleId, permittedRespIds]) => ({
        module_id: Number(moduleId),
        permitted_responsibilities: permittedRespIds,
      }));

      if (!withLabels) {
        return result;
      }

      // Enrich with labels
      return this.enrichRolesWithLabels(result);
    } catch (error) {
      logger.error(`Error fetching responsibilities for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Build default responsibilities for admin/superadmin
   */
  public buildAdminResponsibilities(): Array<{ module_id: number; permitted_responsibilities: number[] }> {
    return this.moduleDetails.modules.map((module: any) => ({
      module_id: module.id,
      permitted_responsibilities: module.responsibilityIds || this.moduleDetails.defaultResponsibilityIds,
    }));
  }

  /**
   * Get responsibilities for user, handling admin/superadmin specially
   */
  public async getResponsibilitiesForUserOrAdmin(
    userId: number,
    userType: number,
    withLabels: boolean = false
  ): Promise<Array<{ module_id: number; permitted_responsibilities: number[] }> | Array<{ module_id: number; module_label: string; responsibilities: Array<{ id: number; label: string }> }>> {
    if (userType === Roles.ADMIN || userType === Roles.SUPERADMIN) {
      const adminRoles = this.buildAdminResponsibilities();
      if (!withLabels) {
        return adminRoles;
      }
      return this.enrichRolesWithLabels(adminRoles);
    }

    return this.getResponsibilitiesForUser(userId, withLabels);
  }

  /**
   * Enrich responsibilities with module and responsibility labels
   */
  private enrichRolesWithLabels(
    rolesData: Array<{ module_id: number; permitted_responsibilities: number[] }>
  ): Array<{ module_id: number; module_label: string; responsibilities: Array<{ id: number; label: string }> }> {
    const moduleMap = new Map<number, string>(
      this.moduleDetails.modules.map((m: any) => [m.id, m.label])
    );
    const responsibilityMap = new Map<number, string>(
      this.moduleDetails.responsibilities.map((r: any) => [r.id, r.label])
    );

    return rolesData.map((role) => ({
      module_id: role.module_id,
      module_label: moduleMap.get(role.module_id) || "Unknown Module",
      responsibilities: role.permitted_responsibilities.map((respId) => ({
        id: respId,
        label: responsibilityMap.get(respId) || "Unknown Responsibility",
      })),
    }));
  }
}
