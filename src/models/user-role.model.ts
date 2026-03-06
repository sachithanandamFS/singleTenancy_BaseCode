import { Model, DataTypes } from "sequelize";
import { sequelize } from "../db/config.js";

interface IUserRoleAttributes {
  user_id: number;
  role_id: number;
  created_at: Date;
  updated_at: Date;
}

interface IUserRoleCreationAttributes
  extends Omit<IUserRoleAttributes, "created_at" | "updated_at"> {}

class UserRole 
  extends Model<IUserRoleAttributes, IUserRoleCreationAttributes>
  implements IUserRoleAttributes 
{
  public user_id!: number;
  public role_id!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

UserRole.init(
  {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    role_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: "roles",
        key: "id",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "user_roles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default UserRole;
