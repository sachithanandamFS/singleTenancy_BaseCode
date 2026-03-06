/**
 * Response DTOs for Employee operations
 * These provide type safety and structure for API responses
 */

export interface EmployeeResponseDTO {
  id: number;
  email: string;
  f_name: string;
  phone_number: string;
  user_type: number;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmployeeListResponseDTO {
  employees: EmployeeResponseDTO[];
  total: number;
}

export interface EmployeeCreatedResponseDTO {
  message: string;
  employee: EmployeeResponseDTO;
}

export interface EmployeeLoginResponseDTO {
  token: string;
  user_type: number;
}

export interface TokenDataResponseDTO {
  email: string;
  name: string;
  user_type: number;
}

export interface EmployeeStatusChangedResponseDTO {
  message: string;
  employee_id: number;
  is_active: boolean;
}

export interface AssignedRolesResponseDTO {
  responsibilities: Array<{
    module_id: number;
    module_label: string;
    responsibilities: Array<{ id: number; label: string }>;
  }>;
}
