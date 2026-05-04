import { apiRequest } from "./api";

export type ApiRole = "OWNER" | "SUPERVISOR" | "FARMER";

export type ApiUser = {
  id: string;
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: ApiRole;
  status?: string;
  farmId?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  user: ApiUser;
  tokens: AuthTokens;
};

export type RefreshResponse = LoginResponse;

export async function login(identifier: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { identifier, password },
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
