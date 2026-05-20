import {
  API_ROLE_VALUES,
  API_USER_STATUS_VALUES,
} from "./apiEnums";

export {
  API_ROLE_VALUES,
  API_USER_STATUS_VALUES,
} from "./apiEnums";

export type ApiRole = (typeof API_ROLE_VALUES)[number];
export type ApiUserStatus = (typeof API_USER_STATUS_VALUES)[number];

/**
 * Permission matrix returned by /auth/me and all user endpoints.
 * All fields are required booleans — the backend always returns the full set.
 */
export type ApiPermissionMatrix = {
  dailyEntry: boolean;
  salesEntry: boolean;
  expenseEntry: boolean;
  inventoryView: boolean;
  costVisibility: boolean;
  reportAccess: boolean;
  companyExpenseEntry: boolean;
  farmerExpenseApproval: boolean;
  purchaseEntry: boolean;
  settlementEntry: boolean;
  financialDashboard: boolean;
};

export type ApiOrganization = {
  id: string;
  name: string;
  slug?: string | null;
  email?: string | null;
  phone?: string | null;
  settings?: Record<string, unknown> | null;
};

/**
 * User record as returned by /auth/me, /auth/login, /auth/refresh,
 * /auth/register-owner, and the /users/* endpoints.
 */
export type ApiUser = {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: ApiRole;
  status: ApiUserStatus;
  organization?: ApiOrganization | null;
  mustChangePassword?: boolean | null;
  biometricEnabled?: boolean | null;
  permissions?: ApiPermissionMatrix | null;
  /** Farm IDs the user is assigned to (populated on user-management endpoints) */
  assignedFarmIds?: string[] | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  user: ApiUser;
  tokens: AuthTokens;
};
