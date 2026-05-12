import { apiRequest } from "../api";
import type {
  ApiBatchExpense,
  ApiExpenseLedger,
  CreateBatchCostRequest,
  CreateBatchExpenseRequest,
  ListResponse,
  UpdateBatchExpenseApprovalRequest,
  UpdateBatchExpenseRequest,
} from "./types";

export async function listBatchExpenses(
  token: string,
  batchId: string,
  params: { ledger?: ApiExpenseLedger } = {},
) {
  return apiRequest<ListResponse<ApiBatchExpense>>(`/batches/${batchId}/expenses`, {
    method: "GET",
    token,
    query: params,
  });
}

export async function createBatchExpense(
  token: string,
  batchId: string,
  payload: CreateBatchExpenseRequest,
) {
  return apiRequest<ApiBatchExpense>(`/batches/${batchId}/expenses`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateBatchExpense(
  token: string,
  batchId: string,
  expenseId: string,
  payload: UpdateBatchExpenseRequest,
) {
  return apiRequest<ApiBatchExpense>(`/batches/${batchId}/expenses/${expenseId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function updateBatchExpenseApproval(
  token: string,
  batchId: string,
  expenseId: string,
  payload: UpdateBatchExpenseApprovalRequest,
) {
  return apiRequest<ApiBatchExpense>(
    `/batches/${batchId}/expenses/${expenseId}/approval`,
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}

export async function listBatchCosts(token: string, batchId: string) {
  return listBatchExpenses(token, batchId);
}

export async function createBatchCost(
  token: string,
  batchId: string,
  payload: CreateBatchCostRequest,
) {
  return createBatchExpense(token, batchId, payload);
}

export async function listLegacyBatchCosts(token: string, batchId: string) {
  return apiRequest<ListResponse<ApiBatchExpense>>(`/batches/${batchId}/costs`, {
    method: "GET",
    token,
  });
}

export async function createLegacyBatchCost(
  token: string,
  batchId: string,
  payload: CreateBatchCostRequest,
) {
  return apiRequest<ApiBatchExpense>(`/batches/${batchId}/costs`, {
    method: "POST",
    token,
    body: payload,
  });
}
