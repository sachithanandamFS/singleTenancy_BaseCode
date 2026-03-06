/**
 * Request DTOs for Employee operations
 * These provide type safety for incoming requests
 */

export interface CreateEmployeeRequestDTO {
  email: string;
  password: string;
  name: string;
  phone: string;
  user_type: number;
}

export interface UpdateEmployeeRequestDTO {
  email?: string;
  name?: string;
  phone?: string;
  user_type?: number;
}

export interface EmployeeLoginRequestDTO {
  email: string;
  password: string;
}

export interface ValidateTokenRequestDTO {
  token: string;
}

export interface AssignRolesRequestDTO {
  r_role_ids: number[];
}

export interface EmployeeIdRequestDTO {
  id: number;
}

export interface ChangePasswordRequestDTO {
  old_password: string;
  new_password: string;
}
