import { AppError } from "../../../utils/appError";
import { errorCodes } from "../../../constants/constants";

/**
 * Email Value Object
 * Encapsulates validation and normalization rules for email
 */
export class Email {
  private readonly value: string;
  private readonly normalized: string;

  private constructor(email: string) {
    this.value = email.trim().toLowerCase();
    this.normalized = this.value;
    this.validate();
  }

  public static create(email: string): Email {
    if (!email || typeof email !== "string") {
      throw new AppError("invalid_email", errorCodes.resBadResponse);
    }
    return new Email(email);
  }

  private validate(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(this.value)) {
      throw new AppError("invalid_email_format", errorCodes.resBadResponse);
    }
  }

  public getValue(): string {
    return this.value;
  }

  public getNormalized(): string {
    return this.normalized;
  }

  public equals(other: Email): boolean {
    return this.normalized === other.normalized;
  }
}
