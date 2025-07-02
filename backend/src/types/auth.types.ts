export interface SignupInput {
  email: string;
  password: string;
  full_name: string;
  role: "candidate" | "recruiter" | "admin" | "agency";
  agency_id?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}
