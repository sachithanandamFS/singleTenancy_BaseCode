import { RoleName } from "./value-objects/RoleName";
import { AppError } from "../../utils/appError";
import { errorCodes } from "../../constants/constants";

/**
 * Role Domain Entity
 * Encapsulates the business logic and invariants of a Role
 */
export class RoleEntity {
  private constructor(
    private readonly id: number | null,
    private readonly roleName: RoleName,
    private readonly description: string,
    private readonly createdAt?: Date,
    private readonly updatedAt?: Date
  ) {}

  /**
   * Factory method to create a new Role entity
   */
  public static create(props: {
    roleName: string;
    description: string;
  }): RoleEntity {
    return new RoleEntity(
      null,
      RoleName.create(props.roleName),
      props.description
    );
  }

  /**
   * Factory method to reconstitute an entity from persistence
   */
  public static reconstitute(props: {
    id: number | string;
    roleName: string;
    description: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): RoleEntity {
    return new RoleEntity(
      typeof props.id === "string" ? Number(props.id) : props.id,
      RoleName.create(props.roleName),
      props.description,
      props.createdAt,
      props.updatedAt
    );
  }

  // Getters
  public getId(): number | null {
    return this.id;
  }

  public getRoleName(): string {
    return this.roleName.getValue();
  }

  public getDescription(): string {
    return this.description;
  }

  public getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  public getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  /**
   * Update role details
   */
  public update(props: {
    roleName?: string;
    description?: string;
  }): RoleEntity {
    if (!props.roleName && !props.description) {
      throw new AppError("no_update_data", errorCodes.resBadResponse);
    }

    return new RoleEntity(
      this.id,
      props.roleName ? RoleName.create(props.roleName) : this.roleName,
      props.description ?? this.description,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): {
    id?: number;
    r_name: string;
    r_description: string;
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      ...(this.id && { id: this.id }),
      r_name: this.roleName.getValue(),
      r_description: this.description,
      ...(this.createdAt && { createdAt: this.createdAt }),
      ...(this.updatedAt && { updatedAt: this.updatedAt }),
    };
  }

  /**
   * Convert to DTO format
   */
  public toDTO(): {
    id: number | null;
    r_name: string;
    r_description: string;
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      id: this.id,
      r_name: this.roleName.getValue(),
      r_description: this.description,
      ...(this.createdAt && { createdAt: this.createdAt }),
      ...(this.updatedAt && { updatedAt: this.updatedAt }),
    };
  }
}
