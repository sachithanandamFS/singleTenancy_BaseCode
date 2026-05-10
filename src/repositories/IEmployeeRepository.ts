import { EmployeeEntity } from "../domain/employee/EmployeeEntity";

/**
 * Employee Repository Interface
 * Pure abstraction for data access - no implementation details
 * Defines the contract for employee data operations
 */
export interface IEmployeeRepository {
  /**
   * Save a new employee
   */
  save(employee: EmployeeEntity, passwordHash: string, transaction?: any): Promise<EmployeeEntity>;

  /**
   * Update an existing employee
   */
  update(employee: EmployeeEntity, transaction?: any): Promise<EmployeeEntity>;

  /**
   * Find employee by ID
   */
  findById(id: number): Promise<EmployeeEntity | null>;

  /**
   * Find employee by email
   */
  findByEmail(email: string): Promise<EmployeeEntity | null>;

  /**
   * Find all employees
   */
  findAll(filters?: { isAdmin: boolean }): Promise<EmployeeEntity[]>;

  /**
   * Check if email exists
   */
  existsByEmail(email: string, excludeId?: number): Promise<boolean>;

  /**
   * Update employee status (active/inactive)
   */
  updateStatus(id: number, isActive: boolean): Promise<void>;

  /**
   * Get employee with roles
   */
  findByIdWithRoles(id: number): Promise<any>;

  /**
   * Get password hash for authentication
   */
  getPasswordHash(id: number): Promise<string | null>;

  /**
   * Update employee password
   */
  updatePassword(id: number, passwordHash: string): Promise<void>;
}
