import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { col, fn, where } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { readFileSync } from 'fs';
import { join } from 'path';
import { IRoleRepository } from './IRoleRepository';
import { RoleEntity } from '../domain/role/RoleEntity';
import Role from '../models/role.model';
import RoleResponsibility from '../models/role-responsibility.model';
import UserRole from '../models/user-role.model';
import { Roles } from '../constants/constants';
import { logger } from '../utils/logger';

@Injectable()
export class RoleRepository implements IRoleRepository {
  private readonly moduleDetails: any;

  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {
    const moduleDetailsPath = join(__dirname, '../../resources/ModuleDetails.json');
    this.moduleDetails = JSON.parse(readFileSync(moduleDetailsPath, 'utf-8'));
  }

  private toDomain(model: Role): RoleEntity {
    return RoleEntity.reconstitute({
      id: Number(model.id),
      roleName: model.r_name,
      description: model.r_description,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  private toDomainList(models: Role[]): RoleEntity[] {
    return models.map(m => this.toDomain(m));
  }

  public async save(role: RoleEntity, transaction?: any): Promise<null> {
    const data = role.toPersistence();
    await Role.create(data as any, { transaction });
    return null;
  }

  public async update(role: RoleEntity, transaction?: any): Promise<null> {
    const id = role.getId();
    if (!id) throw new Error('Cannot update role without ID');

    const data = role.toPersistence();
    await Role.update(data, { where: { id: Number(id) }, transaction });
    return null;
  }

  public async findById(id: number): Promise<RoleEntity | null> {
    const model = await Role.findByPk(id);
    return model ? this.toDomain(model) : null;
  }

  public async findAll(): Promise<RoleEntity[]> {
    const models = await Role.findAll({ order: [['r_name', 'ASC']] });
    return this.toDomainList(models);
  }

  public async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const model = await Role.findOne({
      where: where(fn('LOWER', col('r_name')), name.toLowerCase()),
    });
    if (!model) return false;
    if (excludeId && Number(model.id) === excludeId) return false;
    return true;
  }

  public async assignResponsibilities(
    roleId: number,
    permissions: Array<{ module_id: number; resp_ids: number[] }>,
  ): Promise<void> {
    const transaction = await this.sequelize.transaction();
    try {
      await RoleResponsibility.destroy({ where: { role_id: roleId }, transaction });

      const newPerms = permissions.flatMap(perm =>
        perm.resp_ids.map(resp_id => ({ role_id: roleId, mod_id: perm.module_id, resp_id })),
      );

      for (const perm of newPerms) {
        await RoleResponsibility.create(perm, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async findByIdWithResponsibilities(id: number): Promise<any> {
    const role = await Role.findByPk(id);
    if (!role) return null;

    const roleResponsibilities = await RoleResponsibility.findAll({
      where: { role_id: id },
      attributes: ['mod_id', 'resp_id'],
      raw: true,
    });

    const moduleResponsibilityMap = new Map<number, number[]>();
    roleResponsibilities.forEach((rr: any) => {
      const modId = Number(rr.mod_id);
      const respId = Number(rr.resp_id);
      if (!moduleResponsibilityMap.has(modId)) moduleResponsibilityMap.set(modId, []);
      moduleResponsibilityMap.get(modId)!.push(respId);
    });

    const moduleMap = new Map(this.moduleDetails.modules.map((m: any) => [m.id, m.label]));
    const responsibilityMap = new Map(this.moduleDetails.responsibilities.map((r: any) => [r.id, r.label]));

    const permissions = Array.from(moduleResponsibilityMap.entries()).map(([moduleId, respIds]) => ({
      module_id: moduleId,
      module_label: moduleMap.get(moduleId) ?? 'Unknown Module',
      responsibilities: respIds.map(respId => ({
        id: Number(respId),
        label: responsibilityMap.get(Number(respId)) ?? 'Unknown Responsibility',
      })),
    }));

    return { ...role.toJSON(), permissions };
  }

  public async getResponsibilitiesForUser(
    userId: number,
    withLabels: boolean = false,
  ): Promise<any[]> {
    try {
      const roleIds = await UserRole.findAll({
        where: { user_id: userId },
        attributes: ['role_id'],
        raw: true,
      });

      const roleIdArray = roleIds.map((r: any) => r.role_id);
      if (!roleIdArray.length) {
        logger.warn(`No roles assigned to user ${userId}`);
        return [];
      }

      const responsibilities = await RoleResponsibility.findAll({
        where: { role_id: roleIdArray },
        attributes: ['mod_id', 'resp_id'],
        raw: true,
      });

      if (!responsibilities.length) {
        logger.warn(`No responsibilities found for user ${userId} roles`);
        return [];
      }

      const groupedByModule = responsibilities.reduce((acc: any, item: any) => {
        const moduleId = Number(item.mod_id);
        const respId = Number(item.resp_id);
        if (!acc[moduleId]) acc[moduleId] = [];
        if (!acc[moduleId].includes(respId)) acc[moduleId].push(respId);
        return acc;
      }, {} as Record<number, number[]>);

      const result = Object.entries(groupedByModule).map(([moduleId, permittedRespIds]) => ({
        module_id: Number(moduleId),
        permitted_responsibilities: permittedRespIds as number[],
      }));

      return withLabels ? this.enrichRolesWithLabels(result) : result;
    } catch (error) {
      logger.error(`Error fetching responsibilities for user ${userId}:`, error);
      throw error;
    }
  }

  public buildAdminResponsibilities(): Array<{ module_id: number; permitted_responsibilities: number[] }> {
    return this.moduleDetails.modules.map((module: any) => ({
      module_id: module.id,
      permitted_responsibilities: module.responsibilityIds ?? this.moduleDetails.defaultResponsibilityIds,
    }));
  }

  public async getResponsibilitiesForUserOrAdmin(
    userId: number,
    userType: number,
    withLabels: boolean = false,
  ): Promise<any[]> {
    if (userType === Roles.ADMIN || userType === Roles.SUPERADMIN) {
      const adminRoles = this.buildAdminResponsibilities();
      return withLabels ? this.enrichRolesWithLabels(adminRoles) : adminRoles;
    }
    return this.getResponsibilitiesForUser(userId, withLabels);
  }

  private enrichRolesWithLabels(
    rolesData: Array<{ module_id: number; permitted_responsibilities: number[] }>,
  ): any[] {
    const moduleMap = new Map<number, string>(
      this.moduleDetails.modules.map((m: any) => [m.id, m.label]),
    );
    const responsibilityMap = new Map<number, string>(
      this.moduleDetails.responsibilities.map((r: any) => [r.id, r.label]),
    );

    return rolesData.map(role => ({
      module_id: role.module_id,
      module_label: moduleMap.get(role.module_id) ?? 'Unknown Module',
      responsibilities: role.permitted_responsibilities.map(respId => ({
        id: respId,
        label: responsibilityMap.get(respId) ?? 'Unknown Responsibility',
      })),
    }));
  }
}
