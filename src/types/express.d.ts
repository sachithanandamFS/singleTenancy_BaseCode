import { Request } from "express"

declare global {
  namespace Express {
    interface Request {
      user: {
        id: number
        name: string
        email: string
        user_type: number
        permissions: Array<{ module_id: number; permitted_responsibilities: number[] }>
        [key: string]: any
      }
    }
  }
}
