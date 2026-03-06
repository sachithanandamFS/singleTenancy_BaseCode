import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../db/config.js";

export interface IRoleAttributes {
  id: number;
  r_name: string;
  r_description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRoleCreationAttributes
  extends Optional<
    IRoleAttributes,
    "id" | "createdAt" | "updatedAt"
  > {}


class Role
  extends Model<IRoleAttributes, IRoleCreationAttributes>
  implements IRoleAttributes
{
  public id!: number;
  public r_name!: string;
  public r_description!: string;
  public createdAt?: Date;
  public updatedAt?: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    r_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    r_description: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "roles",
    timestamps: true,
    paranoid: false,
    underscored: true,
  }
);

export default Role;