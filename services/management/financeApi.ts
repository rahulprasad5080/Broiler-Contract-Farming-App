import { apiRequest } from "../api";
import type {
  ApiFinanceEntry,
  ApiFinancePayment,
  ApiFinancePurchase,
  CreateFinanceEntryRequest,
  CreateFinancePaymentRequest,
  CreateFinancePurchaseRequest,
  ListParams,
  ListResponse,
  UpdateFinancePurchaseRequest,
} from "./types";

export async function listFinancePurchases(
  token: string,
  params: ListParams = {},
) {
  return apiRequest<ListResponse<ApiFinancePurchase>>("/finance/purchases", {
    method: "GET",
    token,
    query: params,
  });
}

export async function createFinancePurchase(
  token: string,
  payload: CreateFinancePurchaseRequest,
) {
  return apiRequest<ApiFinancePurchase>("/finance/purchases", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateFinancePurchase(
  token: string,
  purchaseId: string,
  payload: UpdateFinancePurchaseRequest,
) {
  return apiRequest<ApiFinancePurchase>(`/finance/purchases/${purchaseId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function listFinanceEntries(
  token: string,
  params: ListParams = {},
) {
  return apiRequest<ListResponse<ApiFinanceEntry>>("/finance/entries", {
    method: "GET",
    token,
    query: params,
  });
}

export async function createFinanceEntry(
  token: string,
  payload: CreateFinanceEntryRequest,
) {
  return apiRequest<ApiFinanceEntry>("/finance/entries", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listFinancePayments(
  token: string,
  params: ListParams = {},
) {
  return apiRequest<ListResponse<ApiFinancePayment>>("/finance/payments", {
    method: "GET",
    token,
    query: params,
  });
}

export async function createFinancePayment(
  token: string,
  payload: CreateFinancePaymentRequest,
) {
  return apiRequest<ApiFinancePayment>("/finance/payments", {
    method: "POST",
    token,
    body: payload,
  });
}
