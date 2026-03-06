import { Model, DataTypes, Optional, BelongsToManySetAssociationsMixin, BelongsToManyAddAssociationsMixin, Association, BelongsToManyGetAssociationsMixin } from "sequelize";
import { sequelize } from "../db/config.js";
import Role from "./role.model.js";
import { Roles } from "../constants/constants.js";

export interface IUserAttributes {
  id: number;
  email: string;
  u_password: null | string;
  f_name: string;
  is_active: boolean;
  user_type?: number;
  phone_number?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserCreationAttributes
  extends Optional<
    IUserAttributes,
    "id" | "is_active" | "createdAt" | "updatedAt"
  > {}

class User extends Model<IUserAttributes, IUserCreationAttributes> {
  public id!: number;
  public email!: string;
  public u_password!: string;
  public f_name!: string;
  public is_active!: boolean;
  public user_type!: number;
  public phone_number!: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  public setRoles!: BelongsToManySetAssociationsMixin<Role, number>;
  public addRoles!: BelongsToManyAddAssociationsMixin<Role, number>;
  public getRoles!: BelongsToManyGetAssociationsMixin<Role>;
  
    public static associations: {
      roles: Association<User, Role>;
    };
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    u_password: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    f_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    user_type: {
      type: DataTypes.INTEGER,
      defaultValue: Roles.ADMIN,
    },
    phone_number: {
      type: DataTypes.STRING(15),
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
    tableName: "users",
    timestamps: true,
    paranoid: false,
    underscored: true,
  }
);


User.addScope('withRoles', {
  include: [{ association: 'Roles', through: { attributes: [] } }]
});

export default User;
