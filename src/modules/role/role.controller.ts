import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AuthorizeGuard } from '../../common/guards/authorize.guard';
import { Admin } from '../../common/decorators/admin.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { SupportedLanguages, errorCodes } from '../../constants/constants';
import {
  createRoleSchema,
  assignRoleSchema,
  IdParamSchema,
} from '../../validators/validator';
import { validateWithYup } from '../../common/pipes/yup-validation.pipe';

@Controller('roles')
@UseGuards(JwtAuthGuard, AdminGuard, AuthorizeGuard)
@Admin(true)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('v1')
  @HttpCode(errorCodes.resCreated)
  async create(@Body() body: any, @Lang() lang: SupportedLanguages) {
    await validateWithYup(createRoleSchema, { body }, lang);
    return this.roleService.create(body, lang);
  }

  @Get('v1')
  async getAll(@Lang() lang: SupportedLanguages) {
    return this.roleService.getAll(lang);
  }

  @Get('v1/:id')
  async getById(@Param('id') id: string, @Lang() lang: SupportedLanguages) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    return this.roleService.getById(Number(id), lang);
  }

  @Put('v1/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Lang() lang: SupportedLanguages,
  ) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    await validateWithYup(createRoleSchema, { body }, lang);
    return this.roleService.update(Number(id), body, lang);
  }

  @Post('v1/:id/assign-responsibilities')
  @HttpCode(HttpStatus.OK)
  async assignResponsibilities(
    @Param('id') id: string,
    @Body() body: any,
    @Lang() lang: SupportedLanguages,
  ) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    await validateWithYup(assignRoleSchema, { body }, lang);
    return this.roleService.assignResponsibilities(Number(id), body, lang);
  }
}
