import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../../repositories/RoleRepository';
import { RoleDomainService } from '../../domain/role/RoleDomainService';
import { RoleEntity } from '../../domain/role/RoleEntity';
import {
  CreateRoleRequestDTO,
  UpdateRoleRequestDTO,
  AssignResponsibilitiesRequestDTO,
} from '../../application/dtos/role/RoleRequestDTO';
import { AppError } from '../../utils/appError';
import { errorCodes, SupportedLanguages } from '../../constants/constants';
import { InputSanitizer } from '../../application/handlers/shared/InputSanitizer';
import { getTranslation } from '../../services/translation';

@Injectable()
export class RoleService {
  constructor(
    private readonly repository: RoleRepository,
    private readonly domainService: RoleDomainService,
  ) {}

  private t(key: string, lang: SupportedLanguages): string {
    try { return getTranslation(key, lang) || key; } catch { return key; }
  }

  private ok(message: string, data: any, lang: SupportedLanguages) {
    return { success: true, data: data ?? null, message: this.t(message, lang) };
  }

  async create(body: any, lang: SupportedLanguages) {
    const sanitized = InputSanitizer.sanitize<CreateRoleRequestDTO>(body, {
      r_name: 'string', r_desc: 'string',
    });

    await this.domainService.validateUniqueness({ roleName: sanitized.r_name });

    const roleEntity = RoleEntity.create({
      roleName: sanitized.r_name,
      description: sanitized.r_desc,
    });

    await this.repository.save(roleEntity);
    return this.ok('role_created', null, lang);
  }

  async getAll(lang: SupportedLanguages) {
    const roles = await this.repository.findAll();
    return this.ok('role_fetched', roles.map(r => r.toDTO()), lang);
  }

  async getById(id: number, lang: SupportedLanguages) {
    const role = await this.repository.findByIdWithResponsibilities(id);
    return this.ok('role_fetched', role, lang);
  }

  async update(id: number, body: any, lang: SupportedLanguages) {
    const sanitized = InputSanitizer.sanitize<UpdateRoleRequestDTO>(body, {
      r_name: 'string', r_desc: 'string',
    });

    const existingRole = await this.repository.findById(id);
    if (!existingRole) throw new AppError('role_404', errorCodes.resNotFound);

    if (sanitized.r_name) {
      await this.domainService.validateUniquenessForUpdate(id, { roleName: sanitized.r_name });
    }

    const updatedRole = existingRole.update({
      roleName: sanitized.r_name,
      description: sanitized.r_desc,
    });

    await this.repository.update(updatedRole);
    return this.ok('role_updated', null, lang);
  }

  async assignResponsibilities(id: number, body: any, lang: SupportedLanguages) {
    const requestData: AssignResponsibilitiesRequestDTO = body;

    const role = await this.repository.findById(id);
    if (!role) throw new AppError('role_404', errorCodes.resNotFound);

    const sanitizedPermissions = InputSanitizer.sanitizePermissions(requestData.permissions);
    if (!sanitizedPermissions.length) {
      throw new AppError('invalid_permissions', errorCodes.resBadResponse);
    }

    await this.repository.assignResponsibilities(id, sanitizedPermissions);
    return this.ok('role_assigned', null, lang);
  }
}
