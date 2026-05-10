import {
  Table,
  Column,
  Model,
  DataType,
} from 'sequelize-typescript';

@Table({ tableName: 'role_permissions', timestamps: false, underscored: true })
export default class RoleResponsibility extends Model {
  @Column({ type: DataType.BIGINT, allowNull: false, primaryKey: true })
  role_id: number;

  @Column({ type: DataType.BIGINT, allowNull: false, primaryKey: true })
  mod_id: number;

  @Column({ type: DataType.BIGINT, allowNull: false, primaryKey: true })
  resp_id: number;
}
