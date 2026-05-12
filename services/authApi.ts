import { apiRequest } from "./api";
import type { ApiUser, AuthTokens } from "./authTypes";

export type { ApiRole, ApiUser, AuthTokens } from "./authTypes";

export type LoginResponse = {
  user: ApiUser;
  tokens: AuthTokens;
};

export type RefreshResponse = LoginResponse;

export type RegisterOwnerRequest = {
  organizationName: string;
  organizationPhone?: string;
  organizationEmail?: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone: string;
  password: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type LoginPinRequest = {
  phone: string;
  pin: string;
};

export type SetPinRequest = {
  currentPassword: string;
  pin: string;
};

export type UpdateBiometricRequest = {
  enabled: boolean;
};

export async function login(phone: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { phone, password },
  });
}

export async function loginWithPin(payload: LoginPinRequest) {
  return apiRequest<LoginResponse>("/auth/login-pin", {
    method: "POST",
    body: payload,
  });
}

export async function registerOwner(payload: RegisterOwnerRequest) {
  return apiRequest<LoginResponse>("/auth/register-owner", {
    method: "POST",
    body: payload,
  });
}

export async function refreshAuth(refreshToken: string) {
  return apiRequest<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export async function fetchMe(accessToken: string) {
  return apiRequest<ApiUser>("/auth/me", {
    method: "GET",
    token: accessToken,
  });
}

export async function logout(refreshToken: string) {
  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export async function changePassword(token: string, payload: ChangePasswordRequest) {
  return apiRequest<{ message: string }>("/auth/change-password", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function setServerPin(token: string, payload: SetPinRequest) {
  return apiRequest<{ message: string }>("/auth/set-pin", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateServerBiometric(
  token: string,
  payload: UpdateBiometricRequest,
) {
  return apiRequest<ApiUser>("/auth/biometric", {
    method: "POST",
    token,
    body: payload,
  });
}
