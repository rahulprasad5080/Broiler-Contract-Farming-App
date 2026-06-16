import { apiRequest } from "../api";
import type {
  AllocateInventoryRequest,
  ApiInventoryLedgerEntry,
  ApiStockBalance,
  ApiStockMovement,
  BatchReturnRequest,
  BatchTransferRequest,
  ListResponse,
  ListStockBalancesParams,
  ListStockMovementsParams,
  OpeningStockRequest,
  StockAdjustmentRequest,
  StockSaleRequest,
} from "./types";

export async function listInventoryLedger(
  token: string,
  params: {
    catalogItemId?: string;
    batchId?: string;
    vendorId?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  return apiRequest<ListResponse<ApiInventoryLedgerEntry>>("/inventory/ledger", {
    method: "GET",
    token,
    query: params,
  });
}

export async function allocateInventory(token: string, payload: AllocateInventoryRequest) {
  return apiRequest<ApiStockMovement>("/inventory/allocate", {
    method: "POST",
    token,
    body: payload,
  });
}

// ─── New Stock Flow APIs ───────────────────────────────────────────────────────

export async function listStockBalances(
  token: string,
  params: ListStockBalancesParams = {},
) {
  return apiRequest<{ data: ApiStockBalance[] }>("/inventory/balances", {
    method: "GET",
    token,
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
}

export async function listStockMovements(
  token: string,
  params: ListStockMovementsParams = {},
) {
  return apiRequest<{ data: ApiStockMovement[] }>("/inventory/movements", {
    method: "GET",
    token,
    query: params as Record<string, string | number | boolean | null | undefined>,
  });
}

export async function createOpeningStock(token: string, payload: OpeningStockRequest) {
  return apiRequest<ApiStockMovement>("/inventory/opening-stock", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function createBatchReturn(token: string, payload: BatchReturnRequest) {
  return apiRequest<ApiStockMovement>("/inventory/returns", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function createBatchTransfer(token: string, payload: BatchTransferRequest) {
  return apiRequest<ApiStockMovement>("/inventory/transfers", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function createStockAdjustment(token: string, payload: StockAdjustmentRequest) {
  return apiRequest<ApiStockMovement>("/inventory/adjustments", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function createStockSale(token: string, payload: StockSaleRequest) {
  return apiRequest<ApiStockMovement>("/inventory/sales", {
    method: "POST",
    token,
    body: payload,
  });
}
