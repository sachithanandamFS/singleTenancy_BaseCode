import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { EmployeeRepository } from '../../repositories/EmployeeRepository';
import { RoleRepository } from '../../repositories/RoleRepository';
import { EmployeeDomainService } from '../../domain/employee/EmployeeDomainService';
import { EmployeeEntity } from '../../domain/employee/EmployeeEntity';
import {
  CreateEmployeeRequestDTO,
  UpdateEmployeeRequestDTO,
  EmployeeLoginRequestDTO,
  ValidateTokenRequestDTO,
  AssignRolesRequestDTO,
  ChangePasswordRequestDTO,
} from '../../application/dtos/employee/EmployeeRequestDTO';
import { AppError } from '../../utils/appError';
import { errorCodes, hashRoundsPass, LOGIN_MAX_ATTEMPTS, IP_LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_WINDOW_SECONDS, DUMMY_PASSWORD_HASH, Roles, SupportedLanguages } from '../../constants/constants';
import { InputSanitizer } from '../../application/handlers/shared/InputSanitizer';
import { generateToken, blacklistToken } from '../../utils/jwt.utils';
import { verifyWithProvider } from '../../utils/auth.service';
import { incrementSecurityCounter, isSecurityThresholdExceeded, resetSecurityCounter } from '../../utils/securityAudit';
import { getTranslation } from '../../services/translation';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly repository: EmployeeRepository,
    private readonly roleRepository: RoleRepository,
    private readonly domainService: EmployeeDomainService,
  ) {}

  private t(key: string, lang: SupportedLanguages): string {
    try { return getTranslation(key, lang) || key; } catch { return key; }
  }

  private ok(message: string, data: any, lang: SupportedLanguages) {
    return { success: true, data: data ?? null, message: this.t(message, lang) };
  }

  async createEmployee(body: any, lang: SupportedLanguages) {
    const sanitized = InputSanitizer.sanitize<CreateEmployeeRequestDTO>(body, {
      email: 'string', password: 'string', name: 'string', phone: 'string', user_type: 'number',
    });

    const userType = this.domainService.normalizeUserType(sanitized.user_type);
    this.domainService.validatePhoneNumber(sanitized.phone);
    await this.domainService.validateEmailUniqueness(sanitized.email);

    const employeeEntity = EmployeeEntity.create({
      email: sanitized.email,
      name: sanitized.name,
      phoneNumber: sanitized.phone,
      userType,
    });

    const hashedPassword = await bcrypt.hash(sanitized.password, hashRoundsPass);
    await this.repository.save(employeeEntity, hashedPassword);

    return this.ok('employee_created', null, lang);
  }

  async getAllEmployees(user: any, lang: SupportedLanguages) {
    const isAdmin = user?.user_type === Roles.ADMIN || user?.user_type === Roles.SUPERADMIN;
    const employees = await this.repository.findAll({ isAdmin });
    return this.ok('user_found', employees.map(e => e.toDTO()), lang);
  }

  async getEmployeeById(id: number, lang: SupportedLanguages) {
    const employee = await this.repository.findByIdWithRoles(id);
    if (!employee) throw new AppError('user_404', errorCodes.resNotFound);
    return this.ok('user_found', employee, lang);
  }

  async updateEmployee(id: number, body: any, lang: SupportedLanguages) {
    const sanitized = InputSanitizer.sanitize<UpdateEmployeeRequestDTO>(body, {
      email: 'string', name: 'string', phone: 'string', user_type: 'number',
    });

    const existing = await this.repository.findById(id);
    if (!existing) throw new AppError('user_404', errorCodes.resNotFound);

    if (sanitized.email) await this.domainService.validateEmailUniquenessForUpdate(id, sanitized.email);
    if (sanitized.phone) this.domainService.validatePhoneNumber(sanitized.phone);
    if (sanitized.user_type !== undefined) {
      sanitized.user_type = this.domainService.normalizeUserType(sanitized.user_type);
    }

    const updatedEmployee = existing.update({
      email: sanitized.email,
      name: sanitized.name,
      phoneNumber: sanitized.phone,
      userType: sanitized.user_type,
    });

    await this.repository.update(updatedEmployee);
    return this.ok('employee_updated', null, lang);
  }

  async changeEmployeeStatus(id: number, lang: SupportedLanguages) {
    const employee = await this.repository.findById(id);
    if (!employee) throw new AppError('user_404', errorCodes.resNotFound);

    await this.repository.updateStatus(id, !employee.getIsActive());
    return this.ok('employee_status_changed', null, lang);
  }

  async loginEmployee(body: any, ip: string, lang: SupportedLanguages) {
    if (process.env.use_auth0 === 'TRUE' || process.env.use_sso === 'TRUE') {
      throw new AppError('auth_provider_external', errorCodes.resBadResponse);
    }

    const sanitized = InputSanitizer.sanitize<EmployeeLoginRequestDTO>(body, {
      email: 'string', password: 'string',
    });
    const { email, password } = sanitized;

    const emailKey = `sec:login_fail:${email}`;
    const ipKey = `sec:login_fail_ip:${ip}`;

    const [emailLocked, ipLocked] = await Promise.all([
      isSecurityThresholdExceeded(emailKey, LOGIN_MAX_ATTEMPTS),
      isSecurityThresholdExceeded(ipKey, IP_LOGIN_MAX_ATTEMPTS),
    ]);
    if (emailLocked || ipLocked) throw new AppError('account_locked', errorCodes.resTooMany);

    const incrementBoth = () => Promise.all([
      incrementSecurityCounter(emailKey, LOGIN_LOCKOUT_WINDOW_SECONDS),
      incrementSecurityCounter(ipKey, LOGIN_LOCKOUT_WINDOW_SECONDS),
    ]);

    const employee = await this.repository.findByEmail(email);
    if (!employee) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      await incrementBoth();
      throw new AppError('invalid_credentials', errorCodes.resUnauth);
    }

    const employeeId = employee.getId();
    if (!employeeId) {
      await incrementBoth();
      throw new AppError('invalid_credentials', errorCodes.resUnauth);
    }

    const passwordHash = await this.repository.getPasswordHash(employeeId);
    if (!passwordHash) {
      await incrementBoth();
      throw new AppError('invalid_credentials', errorCodes.resUnauth);
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash);
    if (!isValidPassword) {
      await incrementBoth();
      throw new AppError('invalid_credentials', errorCodes.resUnauth);
    }

    await resetSecurityCounter(emailKey);

    const responsibilities = await this.roleRepository.getResponsibilitiesForUserOrAdmin(
      employeeId,
      employee.getUserType(),
      false,
    ) as Array<{ module_id: number; permitted_responsibilities: number[] }>;

    const token = generateToken({
      id: employeeId,
      email: employee.getEmail(),
      user_type: employee.getUserType(),
      name: employee.getName(),
      permissions: responsibilities,
    });

    return this.ok('login_success', { token, user_type: employee.getUserType() }, lang);
  }

  async validateToken(body: any, lang: SupportedLanguages) {
    const sanitized = InputSanitizer.sanitize<ValidateTokenRequestDTO>(body, { token: 'string' });
    try {
      const decoded = await verifyWithProvider(sanitized.token);
      return this.ok('token_valid', {
        email: decoded.email,
        name: decoded.name,
        user_type: decoded.user_type,
      }, lang);
    } catch {
      throw new AppError('invalid_token', errorCodes.resUnauth);
    }
  }

  async getEmployeeRoles(user: any, lang: SupportedLanguages) {
    const employeeId = user?.id;
    if (!employeeId) throw new AppError('user_404', errorCodes.resNotFound);

    const employee = await this.repository.findById(employeeId);
    if (!employee) throw new AppError('user_404', errorCodes.resNotFound);

    const roles = await this.roleRepository.getResponsibilitiesForUserOrAdmin(employeeId, employee.getUserType(), true);
    return this.ok('user_roles_found', { responsibilities: roles }, lang);
  }

  async assignRoles(id: number, body: any, lang: SupportedLanguages) {
    const employee = await this.repository.findById(id);
    if (!employee) throw new AppError('user_404', errorCodes.resNotFound);

    const roleIds = body.r_role_ids;
    if (!Array.isArray(roleIds) || !roleIds.every((r: any) => typeof r === 'number' && Number.isFinite(r))) {
      throw new AppError('invalid_role_ids', errorCodes.resBadResponse);
    }

    await this.repository.assignRoles(id, roleIds);
    return this.ok('roles_assigned', null, lang);
  }

  async logout(authHeader: string | undefined, lang: SupportedLanguages) {
    if (process.env.use_auth0 !== 'TRUE' && process.env.use_sso !== 'TRUE') {
      if (authHeader?.startsWith('Bearer ')) {
        await blacklistToken(authHeader.split(' ')[1]);
      }
    }
    return this.ok('logout_success', null, lang);
  }

  async changePassword(user: any, body: any, authHeader: string | undefined, lang: SupportedLanguages) {
    const employeeId = user?.id;
    if (!employeeId) throw new AppError('unauth', errorCodes.resUnauth);

    const sanitized = InputSanitizer.sanitize<ChangePasswordRequestDTO>(body, {
      old_password: 'string', new_password: 'string',
    });

    const employee = await this.repository.findById(employeeId);
    if (!employee) throw new AppError('user_404', errorCodes.resNotFound);

    const currentHash = await this.repository.getPasswordHash(employeeId);
    if (!currentHash) throw new AppError('user_404', errorCodes.resNotFound);

    const isOldValid = await bcrypt.compare(sanitized.old_password, currentHash);
    if (!isOldValid) throw new AppError('incorrect_old_password', errorCodes.resUnauth);

    const isSame = await bcrypt.compare(sanitized.new_password, currentHash);
    if (isSame) throw new AppError('password_same_as_old', errorCodes.resBadResponse);

    const newHash = await bcrypt.hash(sanitized.new_password, hashRoundsPass);
    await this.repository.updatePassword(employeeId, newHash);

    if (process.env.use_auth0 !== 'TRUE' && process.env.use_sso !== 'TRUE') {
      if (authHeader?.startsWith('Bearer ')) {
        await blacklistToken(authHeader.split(' ')[1]);
      }
    }

    return this.ok('password_changed', null, lang);
  }
}
