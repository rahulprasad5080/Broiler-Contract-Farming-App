import { apiRequest } from "../api";
import { fetchAllPages } from "./pagination";
import type {
  ApiBatch,
  ApiBatchPnl,
  ApiBatchSettlement,
  ApiBatchStatus,
  ApiComment,
  ApiDailyLog,
  ApiSale,
  ApiTreatment,
  CreateBatchRequest,
  CreateBatchSettlementRequest,
  CreateCommentRequest,
  CreateDailyLogRequest,
  CreateSaleRequest,
  CreateTreatmentRequest,
  FinalizeSaleRequest,
  ListParams,
  ListResponse,
  UpdateBatchRequest,
  UpdateBatchStatusRequest,
  UpdateDailyLogRequest,
} from "./types";

export async function listBatches(
  token: string,
  params: ListParams & { farmId?: string; status?: ApiBatchStatus } = {},
) {
  return apiRequest<ListResponse<ApiBatch>>("/batches", {
    method: "GET",
    token,
    query: params,
  });
}

export async function listAllBatches(token: string, search?: string) {
  return fetchAllPages(
    (page, limit) =>
      listBatches(token, {
        page,
        limit,
        search,
      }),
  );
}

export async function fetchBatch(token: string, batchId: string) {
  return apiRequest<ApiBatch>(`/batches/${batchId}`, {
    method: "GET",
    token,
  });
}

export async function createBatch(token: string, payload: CreateBatchRequest) {
  return apiRequest<ApiBatch>("/batches", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateBatch(token: string, batchId: string, payload: UpdateBatchRequest) {
  return apiRequest<ApiBatch>(`/batches/${batchId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function updateBatchStatus(
  token: string,
  batchId: string,
  payload: UpdateBatchStatusRequest,
) {
  return apiRequest<ApiBatch>(`/batches/${batchId}/status`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function listDailyLogs(token: string, batchId: string) {
  return apiRequest<ListResponse<ApiDailyLog>>(`/batches/${batchId}/daily-logs`, {
    method: "GET",
    token,
  });
}

export async function createDailyLog(
  token: string,
  batchId: string,
  payload: CreateDailyLogRequest,
) {
  return apiRequest<ApiDailyLog>(`/batches/${batchId}/daily-logs`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateDailyLog(
  token: string,
  batchId: string,
  dailyLogId: string,
  payload: UpdateDailyLogRequest,
) {
  return apiRequest<ApiDailyLog>(`/batches/${batchId}/daily-logs/${dailyLogId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function listSales(token: string, batchId: string) {
  return apiRequest<ListResponse<ApiSale>>(`/batches/${batchId}/sales`, {
    method: "GET",
    token,
  });
}

export async function createSale(token: string, batchId: string, payload: CreateSaleRequest) {
  return apiRequest<ApiSale>(`/batches/${batchId}/sales`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function finalizeSale(
  token: string,
  batchId: string,
  saleId: string,
  payload: FinalizeSaleRequest,
) {
  return apiRequest<ApiSale>(`/batches/${batchId}/sales/${saleId}/finalize`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function fetchBatchSettlement(token: string, batchId: string) {
  return apiRequest<ApiBatchSettlement>(`/batches/${batchId}/settlement`, {
    method: "GET",
    token,
  });
}

export async function createBatchSettlement(
  token: string,
  batchId: string,
  payload: CreateBatchSettlementRequest,
) {
  return apiRequest<ApiBatchSettlement>(`/batches/${batchId}/settlement`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function fetchBatchPnl(token: string, batchId: string) {
  return apiRequest<ApiBatchPnl>(`/batches/${batchId}/pnl`, {
    method: "GET",
    token,
  });
}

export async function listBatchComments(token: string, batchId: string) {
  return apiRequest<ListResponse<ApiComment>>(`/batches/${batchId}/comments`, {
    method: "GET",
    token,
  });
}

export async function createBatchComment(
  token: string,
  batchId: string,
  payload: CreateCommentRequest,
) {
  return apiRequest<ApiComment>(`/batches/${batchId}/comments`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listTreatments(token: string, batchId: string) {
  return apiRequest<ListResponse<ApiTreatment>>(`/batches/${batchId}/treatments`, {
    method: "GET",
    token,
  });
}

export async function createTreatment(
  token: string,
  batchId: string,
  payload: CreateTreatmentRequest,
) {
  return apiRequest<ApiTreatment>(`/batches/${batchId}/treatments`, {
    method: "POST",
    token,
    body: payload,
  });
}
