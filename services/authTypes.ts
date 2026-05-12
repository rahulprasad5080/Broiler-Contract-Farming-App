export type ApiRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER";

export type ApiPermissionMatrix = {
  dailyEntry?: boolean;
  salesEntry?: boolean;
  expenseEntry?: boolean;
  inventoryView?: boolean;
  costVisibility?: boolean;
  reportAccess?: boolean;
  companyExpenseEntry?: boolean;
  farmerExpenseApproval?: boolean;
  purchaseEntry?: boolean;
  settlementEntry?: boolean;
  financialDashboard?: boolean;
};

export type ApiUser = {
  id: string;
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: ApiRole;
  status?: string;
  farmId?: string;
  mustChangePassword?: boolean;
  biometricEnabled?: boolean;
  permissions?: ApiPermissionMatrix;
  assignedFarmIds?: string[];
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  user: ApiUser;
  tokens: AuthTokens;
};
