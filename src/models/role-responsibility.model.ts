import { Model, DataTypes } from "sequelize";
import { sequelize } from "../db/config.js";

interface IRoleResponsibilityAttributes {
  role_id: number;
  mod_id: number;
  resp_id: number;
}

interface IRoleResponsibilityCreationAttributes
  extends IRoleResponsibilityAttributes {}

class RoleResponsibility
  extends Model<IRoleResponsibilityAttributes, IRoleResponsibilityCreationAttributes>
  implements IRoleResponsibilityAttributes
{
  public role_id!: number;
  public resp_id!: number;
  public mod_id!: number;
}

RoleResponsibility.init(
  {
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
    },
    mod_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
    },
    resp_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
    }
  },
  {
    sequelize,
    tableName: "role_permissions",
    timestamps: false,
    underscored: true,
  }
);

export default RoleResponsibility;
