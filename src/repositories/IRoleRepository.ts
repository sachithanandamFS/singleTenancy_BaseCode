import { RoleEntity } from "../domain/role/RoleEntity";

/**
 * Role Repository Interface
 * Pure abstraction for data access - no implementation details
 * Defines the contract for role data operations
 */
export interface IRoleRepository {
  /**
   * Save a new role
   */
  save(role: RoleEntity): any;

  /**
   * Update an existing role
   */
  update(role: RoleEntity): any;

  /**
   * Find role by ID
   */
  findById(id: number): Promise<RoleEntity | null>;

  /**
   * Find all roles
   */
  findAll(): Promise<RoleEntity[]>;

  /**
   * Check if a role name exists (case-insensitive)
   */
  existsByName(name: string, excludeId?: number): Promise<boolean>;

  /**
   * Assign responsibilities to a role
   */
  assignResponsibilities(roleId: number, permissions: Array<{ module_id: number; resp_ids: number[] }>): Promise<void>;

  /**
   * Get role with responsibilities
   */
  findByIdWithResponsibilities(id: number): Promise<any>;
}
