import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { col, fn, where, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { IEmployeeRepository } from './IEmployeeRepository';
import { EmployeeEntity } from '../domain/employee/EmployeeEntity';
import User from '../models/user.model';
import { Roles } from '../constants/constants';

@Injectable()
export class EmployeeRepository implements IEmployeeRepository {
  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  private toDomain(model: User): EmployeeEntity {
    return EmployeeEntity.reconstitute({
      id: Number(model.id),
      email: model.email,
      name: model.f_name,
      phoneNumber: model.phone_number,
      userType: model.user_type,
      isActive: Boolean(model.is_active),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  private toDomainList(models: User[]): EmployeeEntity[] {
    return models.map(m => this.toDomain(m));
  }

  public async save(
    employee: EmployeeEntity,
    passwordHash: string,
    transaction?: Transaction,
  ): Promise<EmployeeEntity> {
    const data = employee.toPersistence();
    const created = await User.create(
      { ...data, u_password: passwordHash } as any,
      { transaction },
    );
    return this.toDomain(created);
  }

  public async update(
    employee: EmployeeEntity,
    transaction?: Transaction,
  ): Promise<EmployeeEntity> {
    const id = employee.getId();
    if (!id) throw new Error('Cannot update employee without ID');

    const data = employee.toPersistence();
    await User.update(data, { where: { id: Number(id) }, transaction });

    const updated = await User.findByPk(Number(id), { transaction });
    if (!updated) throw new Error('Employee not found after update');
    return this.toDomain(updated);
  }

  public async findById(id: number): Promise<EmployeeEntity | null> {
    const model = await User.findByPk(id);
    return model ? this.toDomain(model) : null;
  }

  public async findByEmail(email: string): Promise<EmployeeEntity | null> {
    const model = await User.findOne({
      where: where(fn('LOWER', col('email')), email.toLowerCase()),
    });
    return model ? this.toDomain(model) : null;
  }

  public async findAll(filters?: { isAdmin: boolean }): Promise<EmployeeEntity[]> {
    const userTypes = filters?.isAdmin
      ? [Roles.EMPLOYEE, Roles.SUPERADMIN, Roles.ADMIN]
      : [Roles.EMPLOYEE];

    const models = await User.findAll({
      where: { user_type: userTypes },
      order: [['f_name', 'ASC']],
    });
    return this.toDomainList(models);
  }

  public async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    const model = await User.findOne({
      where: where(fn('LOWER', col('email')), email.toLowerCase()),
    });
    if (!model) return false;
    if (excludeId && Number(model.id) === excludeId) return false;
    return true;
  }

  public async updateStatus(id: number, isActive: boolean): Promise<void> {
    await User.update({ is_active: isActive }, { where: { id } });
  }

  public async findByIdWithRoles(id: number): Promise<any> {
    const model = await (User as any).scope('withRoles').findByPk(id);
    return model ? model.toJSON() : null;
  }

  public async getPasswordHash(id: number): Promise<string | null> {
    const model = await User.findByPk(id, { attributes: ['u_password'] });
    return model?.u_password ?? null;
  }

  public async assignRoles(userId: number | string, roleIds: number[]): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    await (user as any).setRoles([]);
    await (user as any).setRoles(roleIds);
  }

  public async updatePassword(id: number, passwordHash: string): Promise<void> {
    await User.update({ u_password: passwordHash }, { where: { id } });
  }
}
