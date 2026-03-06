import { AppError } from "../../../utils/appError.js";
import { errorCodes } from "../../../constants/constants.js";

/**
 * RoleName Value Object
 * Encapsulates validation rules for role names
 */
export class RoleName {
  private readonly value: string;
  private readonly normalized: string;

  private constructor(name: string) {
    this.value = name.trim();
    this.normalized = this.value.toLowerCase();
    this.validate();
  }

  public static create(name: string): RoleName {
    if (!name || typeof name !== "string") {
      throw new AppError("invalid_role_name", errorCodes.resBadResponse);
    }
    return new RoleName(name);
  }

  private validate(): void {
    if (this.value.length === 0) {
      throw new AppError("role_name_empty", errorCodes.resBadResponse);
    }

    if (this.value.length > 50) {
      throw new AppError("role_name_too_long", errorCodes.resBadResponse);
    }
  }

  public getValue(): string {
    return this.value;
  }

  public getNormalized(): string {
    return this.normalized;
  }

  public equals(other: RoleName): boolean {
    return this.normalized === other.normalized;
  }
}
