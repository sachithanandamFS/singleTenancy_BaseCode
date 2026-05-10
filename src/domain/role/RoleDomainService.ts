import { Injectable } from '@nestjs/common';
import { RoleName } from './value-objects/RoleName';
import { AppError } from '../../utils/appError';
import { errorCodes } from '../../constants/constants';
import { RoleRepository } from '../../repositories/RoleRepository';

@Injectable()
export class RoleDomainService {
  constructor(private readonly repository: RoleRepository) {}

  public async validateUniqueness(newRole: { roleName: string }): Promise<void> {
    const newName = RoleName.create(newRole.roleName);
    const exists = await this.repository.existsByName(newName.getValue());
    if (exists) {
      throw new AppError('role_exists', errorCodes.resConflict);
    }
  }

  public async validateUniquenessForUpdate(
    roleId: number,
    updatedData: { roleName?: string },
  ): Promise<void> {
    if (!updatedData.roleName) return;
    const newName = RoleName.create(updatedData.roleName);
    const exists = await this.repository.existsByName(newName.getValue(), roleId);
    if (exists) {
      throw new AppError('role_exists', errorCodes.resConflict);
    }
  }
}
