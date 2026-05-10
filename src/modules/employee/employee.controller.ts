import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AuthorizeGuard } from '../../common/guards/authorize.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Admin } from '../../common/decorators/admin.decorator';
import { Authorize } from '../../common/decorators/authorize.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { SupportedLanguages, errorCodes } from '../../constants/constants';
import { responsibilitiesID } from '../../constants/Responsibilities';
import {
  empLoginSchema,
  empTokenSchema,
  createEmployeeSchema,
  updatedEmployeeSchema,
  changePasswordSchema,
  assignUserSchema,
  IdParamSchema,
} from '../../validators/validator';
import { validateWithYup } from '../../common/pipes/yup-validation.pipe';

const MOD_ID = responsibilitiesID.MManageEmployee;

@Controller('employee')
@UseGuards(JwtAuthGuard, AdminGuard, AuthorizeGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Public()
  @Post('v1/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Req() req: Request, @Lang() lang: SupportedLanguages) {
    await validateWithYup(empLoginSchema, { body }, lang);
    return this.employeeService.loginEmployee(body, req.ip ?? '', lang);
  }

  @Public()
  @Post('v1/validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() body: any, @Lang() lang: SupportedLanguages) {
    await validateWithYup(empTokenSchema, { body }, lang);
    return this.employeeService.validateToken(body, lang);
  }

  @Post('v1/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Lang() lang: SupportedLanguages) {
    return this.employeeService.logout(req.headers.authorization, lang);
  }

  @Authorize(MOD_ID, responsibilitiesID.ACreate)
  @Post('v1')
  @HttpCode(errorCodes.resCreated)
  async createEmployee(@Body() body: any, @Lang() lang: SupportedLanguages) {
    await validateWithYup(createEmployeeSchema, { body }, lang);
    return this.employeeService.createEmployee(body, lang);
  }

  @Authorize(MOD_ID, responsibilitiesID.AList)
  @Get('v1')
  async getAllEmployees(@CurrentUser() user: any, @Lang() lang: SupportedLanguages) {
    return this.employeeService.getAllEmployees(user, lang);
  }

  @Admin(true)
  @Get('v1/all-users')
  async getAllUsers(@CurrentUser() user: any, @Lang() lang: SupportedLanguages) {
    return this.employeeService.getAllEmployees(user, lang);
  }

  @Get('v1/get-my-responsibilities')
  async getMyResponsibilities(@CurrentUser() user: any, @Lang() lang: SupportedLanguages) {
    return this.employeeService.getEmployeeRoles(user, lang);
  }

  @Put('v1/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Lang() lang: SupportedLanguages,
  ) {
    await validateWithYup(changePasswordSchema, { body }, lang);
    return this.employeeService.changePassword(user, body, req.headers.authorization, lang);
  }

  @Authorize(MOD_ID, responsibilitiesID.APreview)
  @Get('v1/:id')
  async getEmployeeById(@Param('id') id: string, @Lang() lang: SupportedLanguages) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    return this.employeeService.getEmployeeById(Number(id), lang);
  }

  @Authorize(MOD_ID, responsibilitiesID.AEdit)
  @Put('v1/:id')
  @HttpCode(HttpStatus.OK)
  async updateEmployee(
    @Param('id') id: string,
    @Body() body: any,
    @Lang() lang: SupportedLanguages,
  ) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    await validateWithYup(updatedEmployeeSchema, { body }, lang);
    return this.employeeService.updateEmployee(Number(id), body, lang);
  }

  @Authorize(MOD_ID, responsibilitiesID.AChangeStatus)
  @Put('v1/:id/change-status')
  @HttpCode(HttpStatus.OK)
  async changeEmployeeStatus(@Param('id') id: string, @Lang() lang: SupportedLanguages) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    return this.employeeService.changeEmployeeStatus(Number(id), lang);
  }

  @Admin(false)
  @Post('v1/:id/assign-roles')
  @HttpCode(HttpStatus.OK)
  async assignRoles(
    @Param('id') id: string,
    @Body() body: any,
    @Lang() lang: SupportedLanguages,
  ) {
    await validateWithYup(IdParamSchema, { params: { id: Number(id) } }, lang);
    await validateWithYup(assignUserSchema, { body }, lang);
    return this.employeeService.assignRoles(Number(id), body, lang);
  }
}
