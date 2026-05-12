import { apiRawRequest, apiRequest } from "./api";
import type {
  ApiBatchStatus,
  ApiExpenseCategoryCode,
  ApiExpenseLedger,
  ApiSettlementStatus,
} from "./managementApi";

export type ApiBatchSummary = {
  batchId: string;
  batchCode?: string | null;
  farmId: string;
  farmName?: string | null;
  placementCount?: number | null;
  currentAgeDays?: number | null;
  liveBirds?: number | null;
  mortalityCount?: number | null;
  cullCount?: number | null;
  soldBirdCount?: number | null;
  balanceBirdCount?: number | null;
  mortalityRate?: number | null;
  totalFeedConsumedKg?: number | null;
  totalWeightSoldKg?: number | null;
  fcr?: number | null;
  totalCost?: number | null;
  totalCompanyExpenses?: number | null;
  totalFarmerExpenses?: number | null;
  totalSales?: number | null;
  profitOrLoss?: number | null;
  companyProfitOrLoss?: number | null;
  farmerGrowingIncome?: number | null;
  farmerNetEarnings?: number | null;
  averageSaleRatePerKg?: number | null;
  averageWeightGrams?: number | null;
  settlementStatus?: string | null;
  status?: ApiBatchStatus | string | null;
};

export type ApiFarmSummary = {
  farmId: string;
  farmName?: string | null;
  totalBatches?: number | null;
  activeBatches?: number | null;
  closedBatches?: number | null;
  totalPlacementCount?: number | null;
  totalSales?: number | null;
  totalCost?: number | null;
  totalCompanyExpenses?: number | null;
  totalFarmerExpenses?: number | null;
  profitOrLoss?: number | null;
  companyProfitOrLoss?: number | null;
  farmerNetEarnings?: number | null;
  averageFcr?: number | null;
};

export type ApiOverviewReport = {
  totalFarms?: number | null;
  totalBatches?: number | null;
  activeBatches?: number | null;
  closedBatches?: number | null;
  totalUsers?: number | null;
  totalPlacementCount?: number | null;
  liveBirds?: number | null;
  mortalityToday?: number | null;
  pendingEntries?: number | null;
  totalSales?: number | null;
  totalCost?: number | null;
  totalCompanyExpenses?: number | null;
  totalFarmerExpenses?: number | null;
  profitOrLoss?: number | null;
  companyProfitOrLoss?: number | null;
  farmerNetEarnings?: number | null;
  averageFcr?: number | null;
  investmentTotal?: number | null;
  pendingPayments?: number | null;
  unreadNotifications?: number | null;
};

export type ApiExpenseReportRow = {
  expenseId: string;
  batchId: string;
  batchCode?: string | null;
  farmId: string;
  farmName?: string | null;
  ledger: ApiExpenseLedger;
  category: ApiExpenseCategoryCode;
  expenseDate: string;
  description: string;
  totalAmount: number;
};

export type ApiInventoryReportRow = {
  itemId: string;
  itemName: string;
  itemType?: string | null;
  currentStock?: number | null;
  reorderLevel?: number | null;
  lowStock: boolean;
};

export type ApiProfitabilityReportRow = {
  batchId: string;
  batchCode?: string | null;
  farmName?: string | null;
  companyProfitOrLoss?: number | null;
  farmerNetEarnings?: number | null;
};

export type ApiSettlementReportRow = {
  settlementId: string;
  batchId: string;
  batchCode?: string | null;
  farmName?: string | null;
  farmerName?: string | null;
  growingCharges?: number | null;
  incentives?: number | null;
  farmerExpenses?: number | null;
  deductions?: number | null;
  netPayable?: number | null;
  status: ApiSettlementStatus | string;
};

export async function fetchOverviewReport(token: string) {
  return apiRequest<ApiOverviewReport>("/reports/overview", {
    method: "GET",
    token,
  });
}

export async function fetchFarmSummary(token: string, farmId: string) {
  return apiRequest<ApiFarmSummary>(`/reports/farms/${farmId}/summary`, {
    method: "GET",
    token,
  });
}

export async function fetchBatchSummary(token: string, batchId: string) {
  return apiRequest<ApiBatchSummary>(`/reports/batches/${batchId}/summary`, {
    method: "GET",
    token,
  });
}

export async function fetchExpenseReport(token: string) {
  return apiRequest<ApiExpenseReportRow[]>("/reports/expenses", {
    method: "GET",
    token,
  });
}

export async function fetchInventoryReport(token: string) {
  return apiRequest<ApiInventoryReportRow[]>("/reports/inventory", {
    method: "GET",
    token,
  });
}

export async function fetchProfitabilityReport(token: string) {
  return apiRequest<ApiProfitabilityReportRow[]>("/reports/profitability", {
    method: "GET",
    token,
  });
}

export async function fetchSettlementReport(token: string) {
  return apiRequest<ApiSettlementReportRow[]>("/reports/settlements", {
    method: "GET",
    token,
  });
}

export async function downloadBatchExcelReport(token: string, batchId: string) {
  return apiRawRequest(
    `/reports/batches/${batchId}/export/excel`,
    {
      method: "GET",
      token,
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    },
  );
}

export async function downloadBatchPdfReport(token: string, batchId: string) {
  return apiRawRequest(`/reports/batches/${batchId}/export/pdf`, {
    method: "GET",
    token,
    headers: {
      Accept: "application/pdf",
    },
  });
}
