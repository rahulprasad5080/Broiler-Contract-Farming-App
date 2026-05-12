import { apiRequest } from "./api";
import type { ApiExpenseCategoryCode, ApiPayoutUnit } from "./management/types";

export type ApiOrganizationSettings = {
  currency: string;
  mobileFirst: boolean;
  expenseCategories: {
    farmer: ApiExpenseCategoryCode[] | string[];
    company: ApiExpenseCategoryCode[] | string[];
  };
  payoutRules: {
    defaultPayoutRate: number;
    defaultPayoutUnit: ApiPayoutUnit;
  };
  alertThresholds: {
    pendingEntryDays: number;
    fcr: number;
    mortalityPercent: number;
  };
  financialConfig: {
    supervisorCanAddFarmerExpense: boolean;
    supervisorCanAddCompanyExpense: boolean;
    farmerExpenseRequiresApproval: boolean;
  };
};

export type UpdateOrganizationSettingsRequest = Partial<{
  payoutRules: Partial<ApiOrganizationSettings["payoutRules"]>;
  alertThresholds: Partial<ApiOrganizationSettings["alertThresholds"]>;
  financialConfig: Partial<ApiOrganizationSettings["financialConfig"]>;
}>;

export async function fetchOrganizationSettings(token: string) {
  return apiRequest<ApiOrganizationSettings>("/settings/organization", {
    method: "GET",
    token,
  });
}

export async function updateOrganizationSettings(
  token: string,
  payload: UpdateOrganizationSettingsRequest,
) {
  return apiRequest<ApiOrganizationSettings>("/settings/organization", {
    method: "PUT",
    token,
    body: payload,
  });
}
