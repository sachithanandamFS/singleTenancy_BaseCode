export interface IPermissionCreateData {
  name: string
  description?: string
  active?: boolean
}

export interface IPermissionUpdateData {
  name?: string
  description?: string
  active?: boolean
}
