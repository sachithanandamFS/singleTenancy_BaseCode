export interface IUserSignupData {
  email: string;
  u_password?: string;
  f_name: string;
  user_type: number;
  phone_number?: string;
  is_active?: boolean;
}

export interface ILoginData {
  email?: string;
  password: string;
}

export interface ITokens {
  access_token: string;
  refresh_token: string;
}

export interface IUserUpdateData extends Partial<IUserSignupData> {
  is_active?: boolean;
}
