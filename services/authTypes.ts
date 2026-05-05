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

export type AuthSession = {
  user: ApiUser;
  tokens: AuthTokens;
};
