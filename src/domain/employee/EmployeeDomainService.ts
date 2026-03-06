import { EmployeeEntity } from "./EmployeeEntity.js";
import { Email } from "./value-objects/Email.js";
import { EmployeeName } from "./value-objects/EmployeeName.js";
import { AppError } from "../../utils/appError.js";
import { errorCodes } from "../../constants/constants.js";
import { Roles } from "../../constants/constants.js";
import { EmployeeRepository } from "../../repositories/EmployeeRepository.js";

/**
 * Employee Domain Service
 * Contains business logic that doesn't belong to a single entity
 * Orchestrates domain operations and enforces business rules
 */
export class EmployeeDomainService {
  private readonly repository: EmployeeRepository;

  constructor() {
    this.repository = new EmployeeRepository();
  }

  /**
   * Validates that email is unique by querying database directly
   */
  public async validateEmailUniqueness(newEmail: string): Promise<void> {
    const newEmailObj = Email.create(newEmail);

    // Query database directly instead of fetching all employees
    const exists = await this.repository.existsByEmail(newEmailObj.getValue());
    if (exists) {
      throw new AppError("email_exists", errorCodes.resConflict);
    }
  }

  /**
   * Validates that email is unique for update by querying database directly
   */
  public async validateEmailUniquenessForUpdate(employeeId: number, newEmail: string): Promise<void> {
    const newEmailObj = Email.create(newEmail);

    // Query database directly, excluding current employee ID
    const exists = await this.repository.existsByEmail(newEmailObj.getValue(), employeeId);
    if (exists) {
      throw new AppError("email_exists", errorCodes.resConflict);
    }
  }

  /**
   * Validates user type
   */
  public validateUserType(userType: number): void {
    const validTypes = Object.values(Roles);
    if (!validTypes.includes(userType)) {
      throw new AppError("invalid_user_type", errorCodes.resBadResponse);
    }
  }

  /**
   * Normalizes user type to prevent SUPERADMIN creation
   */
  public normalizeUserType(userType: number): number {
    const validTypes = Object.values(Roles);
    if (!validTypes.includes(userType) || userType === Roles.SUPERADMIN) {
      return Roles.EMPLOYEE;
    }
    return userType;
  }

  /**
   * Validates phone number format
   */
  public validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      throw new AppError("invalid_phone", errorCodes.resBadResponse);
    }

    // Basic phone number validation (allow various formats)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new AppError("invalid_phone_format", errorCodes.resBadResponse);
    }
  }
}
