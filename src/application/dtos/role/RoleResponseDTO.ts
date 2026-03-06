/**
 * Response DTOs for Role operations
 * These provide type safety and structure for API responses
 */

export interface RoleResponseDTO {
  id: number;
  r_name: string;
  r_description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoleWithResponsibilitiesResponseDTO extends RoleResponseDTO {
  permissions: Array<{
    module_id: number;
    resp_ids: number[];
  }>;
}

export interface RoleListResponseDTO {
  roles: RoleResponseDTO[];
  total: number;
}

export interface RoleCreatedResponseDTO {
  message: string;
  role: RoleResponseDTO;
}

export interface RoleUpdatedResponseDTO {
  message: string;
  role: RoleResponseDTO;
}

export interface ResponsibilitiesAssignedResponseDTO {
  message: string;
  role_id: number;
}
