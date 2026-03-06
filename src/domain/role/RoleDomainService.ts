import { RoleEntity } from "./RoleEntity.js";
import { RoleName } from "./value-objects/RoleName.js";
import { AppError } from "../../utils/appError.js";
import { errorCodes } from "../../constants/constants.js";
import { RoleRepository } from "../../repositories/RoleRepository.js";

/**
 * Role Domain Service
 * Contains business logic that doesn't belong to a single entity
 * Orchestrates domain operations and enforces business rules
 */
export class RoleDomainService {
  private readonly repository: RoleRepository;

  constructor() {
    this.repository = new RoleRepository();
  }

  /**
   * Validates that role name is unique by querying database directly
   */
  public async validateUniqueness(newRole: { roleName: string }): Promise<void> {
    const newName = RoleName.create(newRole.roleName);

    // Query database directly instead of fetching all roles
    const exists = await this.repository.existsByName(newName.getValue());
    if (exists) {
      throw new AppError("role_exists", errorCodes.resConflict);
    }
  }

  /**
   * Validates that role name is unique for update by querying database directly
   */
  public async validateUniquenessForUpdate(roleId: number, updatedData: { roleName?: string }): Promise<void> {
    if (!updatedData.roleName) {
      return; // No name update, no validation needed
    }

    const newName = RoleName.create(updatedData.roleName);

    // Query database directly, excluding current role ID
    const exists = await this.repository.existsByName(newName.getValue(), roleId);
    if (exists) {
      throw new AppError("role_exists", errorCodes.resConflict);
    }
  }
}
