import { AppError } from "../../../utils/appError.js";
import { errorCodes } from "../../../constants/constants.js";

/**
 * EmployeeName Value Object
 * Encapsulates validation rules for employee names
 */
export class EmployeeName {
  private readonly value: string;

  private constructor(name: string) {
    this.value = name.trim();
    this.validate();
  }

  public static create(name: string): EmployeeName {
    if (!name || typeof name !== "string") {
      throw new AppError("invalid_employee_name", errorCodes.resBadResponse);
    }
    return new EmployeeName(name);
  }

  private validate(): void {
    if (this.value.length === 0) {
      throw new AppError("employee_name_empty", errorCodes.resBadResponse);
    }

    if (this.value.length > 100) {
      throw new AppError("employee_name_too_long", errorCodes.resBadResponse);
    }
  }

  public getValue(): string {
    return this.value;
  }
}
