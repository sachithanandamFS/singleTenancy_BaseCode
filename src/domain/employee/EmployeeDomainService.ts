import { Injectable } from '@nestjs/common';
import { Email } from './value-objects/Email';
import { AppError } from '../../utils/appError';
import { errorCodes, Roles } from '../../constants/constants';
import { EmployeeRepository } from '../../repositories/EmployeeRepository';

@Injectable()
export class EmployeeDomainService {
  constructor(private readonly repository: EmployeeRepository) {}

  public async validateEmailUniqueness(newEmail: string): Promise<void> {
    const newEmailObj = Email.create(newEmail);
    const exists = await this.repository.existsByEmail(newEmailObj.getValue());
    if (exists) {
      throw new AppError('email_exists', errorCodes.resConflict);
    }
  }

  public async validateEmailUniquenessForUpdate(employeeId: number, newEmail: string): Promise<void> {
    const newEmailObj = Email.create(newEmail);
    const exists = await this.repository.existsByEmail(newEmailObj.getValue(), employeeId);
    if (exists) {
      throw new AppError('email_exists', errorCodes.resConflict);
    }
  }

  public validateUserType(userType: number): void {
    const validTypes = Object.values(Roles);
    if (!validTypes.includes(userType)) {
      throw new AppError('invalid_user_type', errorCodes.resBadResponse);
    }
  }

  public normalizeUserType(userType: number): number {
    const validTypes = Object.values(Roles);
    if (!validTypes.includes(userType) || userType === Roles.SUPERADMIN) {
      return Roles.EMPLOYEE;
    }
    return userType;
  }

  public validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new AppError('invalid_phone', errorCodes.resBadResponse);
    }
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new AppError('invalid_phone_format', errorCodes.resBadResponse);
    }
  }
}
