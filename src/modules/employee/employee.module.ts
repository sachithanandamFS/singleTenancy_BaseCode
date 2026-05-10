import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from '../../repositories/EmployeeRepository';
import { RoleRepository } from '../../repositories/RoleRepository';
import { EmployeeDomainService } from '../../domain/employee/EmployeeDomainService';
import User from '../../models/user.model';
import Role from '../../models/role.model';
import UserRole from '../../models/user-role.model';
import RoleResponsibility from '../../models/role-responsibility.model';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, UserRole, RoleResponsibility])],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeRepository,
    RoleRepository,
    EmployeeDomainService,
  ],
  exports: [EmployeeRepository, RoleRepository],
})
export class EmployeeModule {}
