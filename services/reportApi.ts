import { apiRawRequest, apiRequest } from "./api";

export type ApiBatchSummary = {
  batchId: string;
  batchCode?: string | null;
  farmId: string;
  farmName?: string | null;
  placementCount?: number | null;
  mortalityCount?: number | null;
  cullCount?: number | null;
  soldBirdCount?: number | null;
  balanceBirdCount?: number | null;
  mortalityRate?: number | null;
  totalFeedConsumedKg?: number | null;
  totalWeightSoldKg?: number | null;
  fcr?: number | null;
  totalCost?: number | null;
  totalSales?: number | null;
  profitOrLoss?: number | null;
  averageSaleRatePerKg?: number | null;
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
  profitOrLoss?: number | null;
  averageFcr?: number | null;
};

export type ApiOverviewReport = {
  totalFarms?: number | null;
  totalBatches?: number | null;
  activeBatches?: number | null;
  closedBatches?: number | null;
  totalUsers?: number | null;
  totalPlacementCount?: number | null;
  totalSales?: number | null;
  totalCost?: number | null;
  profitOrLoss?: number | null;
  averageFcr?: number | null;
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
