import { Email } from "./value-objects/Email";
import { EmployeeName } from "./value-objects/EmployeeName";
import { Roles } from "../../constants/constants";

/**
 * Employee Domain Entity
 * Encapsulates the business logic and invariants of an Employee
 */
export class EmployeeEntity {
  private constructor(
    private readonly id: number | null,
    private readonly email: Email,
    private readonly name: EmployeeName,
    private readonly phoneNumber: string,
    private readonly userType: number,
    private readonly isActive: boolean,
    private readonly createdAt?: Date,
    private readonly updatedAt?: Date
  ) {}

  /**
   * Factory method to create a new Employee entity
   */
  public static create(props: {
    email: string;
    name: string;
    phoneNumber: string;
    userType: number;
  }): EmployeeEntity {
    return new EmployeeEntity(
      null,
      Email.create(props.email),
      EmployeeName.create(props.name),
      props.phoneNumber,
      props.userType,
      true, // isActive
      undefined,
      undefined
    );
  }

  /**
   * Factory method to reconstitute an entity from persistence
   */
  public static reconstitute(props: {
    id: number | string;
    email: string;
    name: string;
    phoneNumber: string;
    userType: number;
    isActive: boolean | number;
    createdAt?: Date;
    updatedAt?: Date;
  }): EmployeeEntity {
    return new EmployeeEntity(
      typeof props.id === "string" ? Number(props.id) : props.id,
      Email.create(props.email),
      EmployeeName.create(props.name),
      props.phoneNumber,
      props.userType,
      Boolean(props.isActive),
      props.createdAt,
      props.updatedAt
    );
  }

  // Getters
  public getId(): number | null {
    return this.id;
  }

  public getEmail(): string {
    return this.email.getValue();
  }

  public getName(): string {
    return this.name.getValue();
  }

  public getPhoneNumber(): string {
    return this.phoneNumber;
  }

  public getUserType(): number {
    return this.userType;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  public getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  /**
   * Update employee details
   */
  public update(props: {
    email?: string;
    name?: string;
    phoneNumber?: string;
    userType?: number;
  }): EmployeeEntity {
    return new EmployeeEntity(
      this.id,
      props.email ? Email.create(props.email) : this.email,
      props.name ? EmployeeName.create(props.name) : this.name,
      props.phoneNumber ?? this.phoneNumber,
      props.userType ?? this.userType,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Toggle active status
   */
  public toggleStatus(): EmployeeEntity {
    return new EmployeeEntity(
      this.id,
      this.email,
      this.name,
      this.phoneNumber,
      this.userType,
      !this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): {
    id?: number;
    email: string;
    f_name: string;
    phone_number: string;
    user_type: number;
    is_active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      ...(this.id && { id: this.id }),
      email: this.email.getValue(),
      f_name: this.name.getValue(),
      phone_number: this.phoneNumber,
      user_type: this.userType,
      is_active: this.isActive,
      ...(this.createdAt && { createdAt: this.createdAt }),
      ...(this.updatedAt && { updatedAt: this.updatedAt }),
    };
  }

  /**
   * Convert to DTO format
   */
  public toDTO(): {
    id: number | null;
    email: string;
    f_name: string;
    phone_number: string;
    user_type: number;
    is_active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      id: this.id,
      email: this.email.getValue(),
      f_name: this.name.getValue(),
      phone_number: this.phoneNumber,
      user_type: this.userType,
      is_active: this.isActive,
      ...(this.createdAt && { createdAt: this.createdAt }),
      ...(this.updatedAt && { updatedAt: this.updatedAt }),
    };
  }
}
