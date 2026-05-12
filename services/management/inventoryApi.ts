import { apiRequest } from "../api";
import type {
  AllocateInventoryRequest,
  ApiInventoryLedgerEntry,
  ListResponse,
} from "./types";

export async function listInventoryLedger(
  token: string,
  params: { catalogItemId?: string; batchId?: string } = {},
) {
  return apiRequest<ListResponse<ApiInventoryLedgerEntry>>("/inventory/ledger", {
    method: "GET",
    token,
    query: params,
  });
}

export async function allocateInventory(token: string, payload: AllocateInventoryRequest) {
  return apiRequest<ApiInventoryLedgerEntry>("/inventory/allocate", {
    method: "POST",
    token,
    body: payload,
  });
}
