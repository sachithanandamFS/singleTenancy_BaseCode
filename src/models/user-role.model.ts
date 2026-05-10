import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import User from './user.model';
import Role from './role.model';

@Table({
  tableName: 'user_roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class UserRole extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, primaryKey: true })
  user_id: number;

  @ForeignKey(() => Role)
  @Column({ type: DataType.BIGINT, primaryKey: true })
  role_id: number;
}
