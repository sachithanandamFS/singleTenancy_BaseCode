import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleRepository } from '../../repositories/RoleRepository';
import { RoleDomainService } from '../../domain/role/RoleDomainService';
import Role from '../../models/role.model';
import RoleResponsibility from '../../models/role-responsibility.model';
import UserRole from '../../models/user-role.model';

@Module({
  imports: [SequelizeModule.forFeature([Role, RoleResponsibility, UserRole])],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository, RoleDomainService],
  exports: [RoleRepository],
})
export class RoleModule {}
