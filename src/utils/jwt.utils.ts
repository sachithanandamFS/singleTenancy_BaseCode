import jwt, { JwtPayload } from "jsonwebtoken";
import type { StringValue } from "ms";

const secret = process.env.JWT_ACCESS_SECRET as string;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN as string;

export interface JwtUserPayload {
  id: number;
  email: string;
  user_type: number;
  name: string;
  permissions: Array<{ module_id: number; permitted_responsibilities: number[] }>;
}

const resolveAccessSecret = (): string => {
  return secret;
};

const expiresIn = (): StringValue => {
  return ACCESS_TOKEN_EXPIRES_IN as StringValue;
};

export const generateToken = (user: JwtUserPayload): string => {
  const payload: JwtUserPayload = {
    id: user.id,
    email: user.email,
    user_type: user.user_type,
    name: user.name,
    permissions: user.permissions,
  };
  return jwt.sign(payload, resolveAccessSecret(), { expiresIn: expiresIn() });
};

export const verifyToken = (token: string): JwtUserPayload & JwtPayload => {
  return jwt.verify(token, resolveAccessSecret()) as JwtUserPayload & JwtPayload;
};
