import {
  Table,
  Column,
  Model,
  DataType,
  BelongsToMany,
  AutoIncrement,
  PrimaryKey,
  Unique,
  Default,
  Scopes,
} from 'sequelize-typescript';
import { Roles } from '../constants/constants';
import Role from './role.model';
import UserRole from './user-role.model';

export interface IUserAttributes {
  id: number;
  email: string;
  u_password: string | null;
  f_name: string;
  is_active: boolean;
  user_type?: number;
  phone_number?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Scopes(() => ({
  withRoles: {
    include: [{ model: Role, through: { attributes: [] } }],
  },
}))
@Table({ tableName: 'users', timestamps: true, underscored: true })
export default class User extends Model<IUserAttributes> {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.BIGINT)
  id: number;

  @Unique
  @Column({ type: DataType.STRING(500), allowNull: false })
  email: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  u_password: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  f_name: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @Default(Roles.ADMIN)
  @Column(DataType.INTEGER)
  user_type: number;

  @Column({ type: DataType.STRING(15), allowNull: false })
  phone_number: string;

  @BelongsToMany(() => Role, () => UserRole)
  roles: Role[];
}
