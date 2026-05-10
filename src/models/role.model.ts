import {
  Table,
  Column,
  Model,
  DataType,
  BelongsToMany,
  AutoIncrement,
  PrimaryKey,
  Unique,
} from 'sequelize-typescript';
import User from './user.model';
import UserRole from './user-role.model';

export interface IRoleAttributes {
  id: number;
  r_name: string;
  r_description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({ tableName: 'roles', timestamps: true, underscored: true })
export default class Role extends Model<IRoleAttributes> {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.BIGINT)
  id: number;

  @Unique
  @Column({ type: DataType.STRING(50), allowNull: false })
  r_name: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  r_description: string;

  @BelongsToMany(() => User, () => UserRole)
  users: User[];
}
