/**
 * Request DTOs for Role operations
 * These provide type safety for incoming requests
 */

export interface CreateRoleRequestDTO {
  r_name: string;
  r_desc: string;
}

export interface UpdateRoleRequestDTO {
  r_name?: string;
  r_desc?: string;
}

export interface RoleIdRequestDTO {
  id: number;
}

export interface AssignResponsibilitiesRequestDTO {
  permissions: Array<{
    module_id: number;
    resp_ids: number[];
  }>;
}
