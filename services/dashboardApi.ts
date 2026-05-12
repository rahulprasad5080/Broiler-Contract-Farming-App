import { apiRequest } from "./api";
import type { ApiBatchStatus, ApiPaymentDirection } from "./management/types";
import type {
  ApiNotificationSeverity,
  ApiNotificationType,
} from "./notificationApi";

export type ApiPaymentStatusSummary = {
  pending: number;
  partial: number;
  paid: number;
};

export type ApiDashboardAlert = {
  id: string;
  type: ApiNotificationType;
  severity: ApiNotificationSeverity;
  title: string;
  message: string;
  batchId?: string | null;
  farmId?: string | null;
  createdAt: string;
};

export type ApiDashboardBatch = {
  batchId: string;
  batchCode: string;
  farmId: string;
  farmName?: string | null;
  status: ApiBatchStatus;
  currentAgeDays?: number | null;
  liveBirds?: number | null;
  mortalityPercent?: number | null;
};

export type ApiDashboardSummary = {
  farmCount?: number | null;
  today: {
    activeBatches?: number | null;
    liveBirds?: number | null;
    mortalityToday?: number | null;
    mortalityTotal?: number | null;
    salesReady?: number | null;
    pendingEntries?: number | null;
    feedAlert?: number | null;
    fcrAlert?: number | null;
  };
  activeBatches: ApiDashboardBatch[];
  paymentStatus?: ApiPaymentStatusSummary;
  alerts: ApiDashboardAlert[];
};

export type ApiFinancialDashboardTransaction = {
  id: string;
  type: string;
  direction: ApiPaymentDirection;
  amount: number;
  date: string;
  description?: string | null;
};

export type ApiFinancialDashboard = {
  summary: {
    investment?: number | null;
    expenses?: number | null;
    sales?: number | null;
    netProfitOrLoss?: number | null;
  };
  recentTransactions: ApiFinancialDashboardTransaction[];
  paymentStatus?: ApiPaymentStatusSummary;
};

export async function fetchDashboard(token: string) {
  return apiRequest<ApiDashboardSummary>("/dashboard", {
    method: "GET",
    token,
  });
}

export async function fetchFinancialDashboard(token: string) {
  return apiRequest<ApiFinancialDashboard>("/dashboard/financial", {
    method: "GET",
    token,
  });
}
