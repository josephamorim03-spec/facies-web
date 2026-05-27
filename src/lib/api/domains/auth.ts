import { api } from "../shared/http";

// local auth endpoints
export type AuthSignupResponse = {
  user_id: string;
  email: string;
  email_verified: boolean;
  verification_expires_at: string;
};

export type AuthLoginResponse = {
  access_token?: string;
  token_type: string;
  user_id: string;
  email: string;
  email_verified: boolean;
};

export type AuthVerifyEmailResponse = {
  verified: boolean;
  user_id: string;
  email: string;
};

export type AuthForgotPasswordResponse = {
  sent: boolean;
  email: string;
  reset_expires_at: string | null;
};

export type AuthResendVerificationResponse = {
  sent: boolean;
  email: string;
  verification_expires_at: string | null;
};

export type AuthResetPasswordResponse = {
  password_reset: boolean;
  user_id: string;
  email: string;
};

export async function signupLocalAccount(payload: {
  email: string;
  password: string;
  confirm_password: string;
  captcha_token: string;
  terms_accepted: boolean;
  terms_version: string;
  first_name?: string;
  last_name?: string;
}): Promise<AuthSignupResponse> {
  return api<AuthSignupResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginLocalAccount(payload: { email: string; password: string }): Promise<AuthLoginResponse> {
  return api<AuthLoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyLocalEmail(token: string): Promise<AuthVerifyEmailResponse> {
  return api<AuthVerifyEmailResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function forgotLocalPassword(payload: { email: string }): Promise<AuthForgotPasswordResponse> {
  return api<AuthForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendLocalVerification(payload: { email: string }): Promise<AuthResendVerificationResponse> {
  return api<AuthResendVerificationResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetLocalPassword(payload: {
  token: string;
  new_password: string;
}): Promise<AuthResetPasswordResponse> {
  return api<AuthResetPasswordResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------

