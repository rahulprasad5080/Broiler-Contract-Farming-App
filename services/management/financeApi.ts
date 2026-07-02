import { apiRequest } from "../api";
import type {
  ApiFinanceEntry,
  ApiFinancePayment,
  ApiFinancePurchase,
  ApiOfficeExpense,
  ApiPurchaseTransaction,
  CreateFinanceEntryRequest,
  CreateFinancePaymentRequest,
  CreateFinancePurchaseRequest,
  CreateOfficeExpenseRequest,
  CreatePurchaseTransactionRequest,
  ListParams,
  ListPurchaseTransactionsParams,
  ListResponse,
  UpdateFinanceEntryRequest,
  UpdateFinancePurchaseRequest,
  UpdateOfficeExpenseRequest,
} from "./types";


export async function listFinancePurchases(
  token: string,
  params: ListParams & {
    vendorId?: string;
    catalogItemId?: string;
    warehouseId?: string;
    purchaseTransactionId?: string;
  } = {},
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

export async function updateFinanceEntry(
  token: string,
  entryId: string,
  payload: UpdateFinanceEntryRequest,
) {
  return apiRequest<ApiFinanceEntry>(`/finance/entries/${entryId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteFinanceEntry(
  token: string,
  entryId: string,
) {
  return apiRequest<void>(`/finance/entries/${entryId}`, {
    method: "DELETE",
    token,
  });
}


export async function listFinancePayments(
  token: string,
  params: ListParams & {
    vendorId?: string;
    traderId?: string;
    partyType?: string;
    referenceType?: string;
    paymentMode?: "CASH" | "ACCOUNT";
  } = {},
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

// ─── New Purchase Transaction APIs ─────────────────────────────────────────────

export async function listPurchaseTransactions(
  token: string,
  params: ListPurchaseTransactionsParams = {},
) {
  return apiRequest<ListResponse<ApiPurchaseTransaction>>("/finance/purchase-transactions", {
    method: "GET",
    token,
    query: params,
  });
}

export async function getPurchaseTransaction(token: string, transactionId: string) {
  return apiRequest<ApiPurchaseTransaction>(
    `/finance/purchase-transactions/${transactionId}`,
    { method: "GET", token },
  );
}

export async function createPurchaseTransaction(
  token: string,
  payload: CreatePurchaseTransactionRequest,
) {
  return apiRequest<ApiPurchaseTransaction>("/finance/purchase-transactions", {
    method: "POST",
    token,
    body: payload,
  });
}

// ─── Office Expense APIs ───────────────────────────────────────────────────────

export async function listOfficeExpenses(
  token: string,
  params: ListParams & {
    vendorId?: string;
    paymentStatus?: string;
    category?: string;
  } = {},
) {
  return apiRequest<ListResponse<ApiOfficeExpense>>("/finance/office-expenses", {
    method: "GET",
    token,
    query: params,
  });
}

export async function createOfficeExpense(
  token: string,
  payload: CreateOfficeExpenseRequest,
) {
  return apiRequest<ApiOfficeExpense>("/finance/office-expenses", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateOfficeExpense(
  token: string,
  expenseId: string,
  payload: UpdateOfficeExpenseRequest,
) {
  return apiRequest<ApiOfficeExpense>(`/finance/office-expenses/${expenseId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteOfficeExpense(
  token: string,
  expenseId: string,
) {
  return apiRequest<void>(`/finance/office-expenses/${expenseId}`, {
    method: "DELETE",
    token,
  });
}

export async function deleteFinancePurchase(
  token: string,
  purchaseId: string,
) {
  return apiRequest<void>(`/finance/purchases/${purchaseId}`, {
    method: "DELETE",
    token,
  });
}
