import { apiRequest } from "./api";

export type ApiRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER";
export type ApiUserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type ApiFarmStatus = "ACTIVE" | "INACTIVE";
export type ApiBatchStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "PLANNED"
  | "SALES_RUNNING"
  | "SETTLEMENT_PENDING"
  | "READY_FOR_SALE"
  | "CLOSED";
export type ApiSaleStatus = "CANCELLED" | "DRAFT" | "CONFIRMED";
export type ApiTreatmentKind = "OTHER" | "VACCINATION" | "MEDICATION";
export type ApiExpenseCategoryCode =
  | "CHICKS"
  | "FEED"
  | "MEDICINE"
  | "VACCINE"
  | "TRANSPORT"
  | "OFFICE_EXPENSE"
  | "SUPERVISOR_EXPENSE"
  | "OTHER_COMPANY"
  | "ELECTRICITY"
  | "COCO_PITH"
  | "LABOUR"
  | "WATER"
  | "DIESEL"
  | "SHED_MAINTENANCE"
  | "REPAIRS"
  | "MISCELLANEOUS"
  | "OTHER_FARMER";

export type ApiCostCategory = ApiExpenseCategoryCode;
export type ApiExpenseLedger = "COMPANY" | "FARMER";
export type ApiExpenseApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ApiTransactionPaymentStatus = "CANCELLED" | "PENDING" | "PARTIAL" | "PAID";
export type ApiInventoryMovementType = "PURCHASE" | "ALLOCATION" | "ADJUSTMENT" | "RETURN";
export type ApiPurchaseType = "CHICKS" | "FEED" | "MEDICINE" | "VACCINE" | "EQUIPMENT" | "OTHER";
export type ApiCatalogItemType = ApiPurchaseType;
export type ApiCommentTargetType =
  | "PURCHASE"
  | "SETTLEMENT"
  | "FARM"
  | "BATCH"
  | "DAILY_LOG"
  | "TREATMENT"
  | "COST"
  | "SALE"
  | "PAYMENT";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type ApiUser = {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: ApiRole;
  status: ApiUserStatus;
  mustChangePassword?: boolean;
  biometricEnabled?: boolean;
  permissions?: ApiPermissionMatrix;
  assignedFarmIds?: string[];
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiPermissionMatrix = {
  dailyEntry?: boolean;
  salesEntry?: boolean;
  expenseEntry?: boolean;
  inventoryView?: boolean;
  costVisibility?: boolean;
  reportAccess?: boolean;
  companyExpenseEntry?: boolean;
  farmerExpenseApproval?: boolean;
  purchaseEntry?: boolean;
  settlementEntry?: boolean;
  financialDashboard?: boolean;
};

export type ApiFarmAssignment = {
  userId: string;
  name: string;
  role: ApiRole;
};

export type ApiFarm = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  location?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  capacity?: number | null;
  status: ApiFarmStatus;
  notes?: string | null;
  primaryFarmerId?: string | null;
  supervisorId?: string | null;
  primaryFarmerName?: string | null;
  supervisorName?: string | null;
  assignments: ApiFarmAssignment[];
  activeBatchCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiBatch = {
  id: string;
  organizationId: string;
  farmId: string;
  farmName?: string | null;
  code: string;
  placementDate: string;
  placementCount: number;
  chickCostTotal?: number | null;
  chickRatePerBird?: number | null;
  sourceHatchery?: string | null;
  targetCloseDate?: string | null;
  actualCloseDate?: string | null;
  status: ApiBatchStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiTrader = {
  id: string;
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiDailyLog = {
  id: string;
  organizationId: string;
  batchId: string;
  logDate: string;
  openingBirdCount?: number | null;
  mortalityCount?: number | null;
  cullCount?: number | null;
  feedConsumedKg?: number | null;
  waterConsumedLtr?: number | null;
  avgWeightGrams?: number | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  correctedById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSale = {
  id: string;
  organizationId: string;
  batchId: string;
  traderId: string;
  saleDate: string;
  birdCount?: number | null;
  totalWeightKg?: number | null;
  ratePerKg?: number | null;
  grossAmount?: number | null;
  transportCharge?: number | null;
  commissionCharge?: number | null;
  otherDeduction?: number | null;
  netAmount?: number | null;
  paymentReceivedAmount?: number | null;
  status: ApiSaleStatus;
  notes?: string | null;
  clientReferenceId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiTreatment = {
  id: string;
  organizationId: string;
  batchId: string;
  dailyLogId?: string | null;
  kind: ApiTreatmentKind;
  catalogItemId?: string | null;
  treatmentDate: string;
  treatmentName: string;
  dosage?: string | null;
  birdCount?: number | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  administeredById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiCatalogItem = {
  id: string;
  organizationId: string;
  name: string;
  type: ApiCatalogItemType;
  sku?: string | null;
  unit: string;
  defaultRate?: number | null;
  manufacturer?: string | null;
  reorderLevel?: number | null;
  currentStock?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiBatchExpense = {
  id: string;
  organizationId: string;
  batchId: string;
  catalogItemId?: string | null;
  ledger: ApiExpenseLedger;
  category: ApiExpenseCategoryCode;
  expenseDate: string;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  totalAmount: number;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  billPhotoUrl?: string | null;
  paymentStatus?: ApiTransactionPaymentStatus | null;
  paidAmount?: number | null;
  approvalStatus?: ApiExpenseApprovalStatus | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiCost = ApiBatchExpense;

export type ApiInventoryLedgerEntry = {
  id: string;
  organizationId: string;
  catalogItemId: string;
  catalogItemName?: string | null;
  batchId?: string | null;
  movementType: ApiInventoryMovementType;
  movementDate: string;
  quantityIn?: number | null;
  quantityOut?: number | null;
  balanceAfter?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
};

export type ApiFinancePurchase = {
  id: string;
  organizationId: string;
  batchId?: string | null;
  purchaseType: ApiPurchaseType;
  vendorName?: string | null;
  catalogItemId?: string | null;
  itemName: string;
  quantity?: number | null;
  unit?: string | null;
  unitCost?: number | null;
  totalAmount: number;
  invoiceNumber?: string | null;
  paymentStatus: ApiTransactionPaymentStatus;
  paidAmount?: number | null;
  purchaseDate: string;
  attachmentUrl?: string | null;
  remarks?: string | null;
  clientReferenceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiComment = {
  id: string;
  organizationId: string;
  batchId?: string | null;
  targetType: ApiCommentTargetType;
  targetId: string;
  comment: string;
  correctionNote?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserRequest = {
  name: string;
  password: string;
  role: ApiRole;
  email?: string;
  phone?: string;
  permissions?: ApiPermissionMatrix;
  assignedFarmIds?: string[];
};

export type UpdateUserRequest = {
  name?: string;
  password?: string;
  role?: ApiRole;
  email?: string;
  phone?: string;
};

export type UpdateUserStatusRequest = {
  status: ApiUserStatus;
};

export type ResetUserPasswordRequest = {
  newPassword: string;
};

export type CreateFarmRequest = {
  name: string;
  code: string;
  location?: string;
  village?: string;
  district?: string;
  state?: string;
  capacity?: number;
  notes?: string;
  primaryFarmerId?: string;
  supervisorId?: string;
  assignmentUserIds?: string[];
};

export type UpdateFarmRequest = CreateFarmRequest & {
  status?: ApiFarmStatus;
};

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateBatchRequest = {
  farmId: string;
  code: string;
  placementDate: string;
  placementCount: number;
  chickCostTotal?: number;
  chickRatePerBird?: number;
  sourceHatchery?: string;
  targetCloseDate?: string;
  notes?: string;
};

export type UpdateBatchRequest = Partial<CreateBatchRequest>;

export type UpdateBatchStatusRequest = {
  status: ApiBatchStatus;
  actualCloseDate?: string | null;
};

export type CreateDailyLogRequest = {
  logDate: string;
  openingBirdCount?: number;
  mortalityCount?: number;
  cullCount?: number;
  feedConsumedKg?: number;
  waterConsumedLtr?: number;
  avgWeightGrams?: number;
  notes?: string;
  clientReferenceId?: string;
};

export type UpdateDailyLogRequest = CreateDailyLogRequest;

export type CreateSaleRequest = {
  traderId: string;
  saleDate: string;
  birdCount?: number;
  totalWeightKg?: number;
  ratePerKg?: number;
  transportCharge?: number;
  commissionCharge?: number;
  otherDeduction?: number;
  paymentReceivedAmount?: number;
  status?: ApiSaleStatus;
  notes?: string;
  clientReferenceId?: string;
};

export type CreateTraderRequest = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type UpdateTraderRequest = Partial<CreateTraderRequest>;

export type CreateCatalogItemRequest = {
  name: string;
  type: ApiCatalogItemType;
  sku?: string;
  unit: string;
  defaultRate?: number;
  manufacturer?: string;
  reorderLevel?: number;
  currentStock?: number;
};

export type UpdateCatalogItemRequest = Partial<CreateCatalogItemRequest>;

export type CreateBatchExpenseRequest = {
  ledger: ApiExpenseLedger;
  category: ApiExpenseCategoryCode;
  catalogItemId?: string;
  expenseDate: string;
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  totalAmount?: number;
  vendorName?: string;
  invoiceNumber?: string;
  billPhotoUrl?: string;
  notes?: string;
  clientReferenceId?: string;
};

export type UpdateBatchExpenseRequest = Partial<
  Omit<CreateBatchExpenseRequest, "clientReferenceId">
> & {
  paymentStatus?: ApiTransactionPaymentStatus;
  paidAmount?: number;
};

export type UpdateBatchExpenseApprovalRequest = {
  approvalStatus: ApiExpenseApprovalStatus;
  rejectedReason?: string;
};

export type CreateBatchCostRequest = CreateBatchExpenseRequest;

export type CreateFinancePurchaseRequest = {
  batchId?: string;
  purchaseType: ApiPurchaseType;
  vendorName?: string;
  catalogItemId?: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  totalAmount: number;
  invoiceNumber?: string;
  paymentStatus?: ApiTransactionPaymentStatus;
  purchaseDate: string;
  attachmentUrl?: string;
  remarks?: string;
  clientReferenceId?: string;
};

export type UpdateFinancePurchaseRequest = Partial<
  Omit<CreateFinancePurchaseRequest, "clientReferenceId">
>;

export type AllocateInventoryRequest = {
  batchId: string;
  catalogItemId: string;
  quantity: number;
  remarks?: string;
};

export type CreateTreatmentRequest = {
  dailyLogId?: string;
  kind: ApiTreatmentKind;
  catalogItemId?: string;
  treatmentDate: string;
  treatmentName: string;
  dosage?: string;
  birdCount?: number;
  notes?: string;
  clientReferenceId?: string;
};

export type CreateCommentRequest = {
  targetType: ApiCommentTargetType;
  targetId: string;
  comment: string;
  correctionNote?: string;
};

async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<ListResponse<T>>,
  limit = 100,
) {
  const firstPage = await fetchPage(1, limit);
  const totalPages = Math.max(1, firstPage.meta.totalPages || 1);

  if (totalPages === 1) {
    return firstPage;
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2, limit)),
  );

  return {
    data: [firstPage.data, ...rest.map((page) => page.data)].flat(),
    meta: {
      ...firstPage.meta,
      page: 1,
      limit: firstPage.meta.total,
      total: firstPage.meta.total,
      totalPages: 1,
    },
  } as ListResponse<T>;
}

export async function listUsers(
  token: string,
  params: ListParams = {},
) {
  return apiRequest<ListResponse<ApiUser>>("/users", {
    method: "GET",
    token,
    query: params,
  });
}

export async function listAllUsers(token: string, search?: string) {
  return fetchAllPages(
    (page, limit) =>
      listUsers(token, {
        page,
        limit,
        search,
      }),
  );
}

export async function createUser(token: string, payload: CreateUserRequest) {
  return apiRequest<ApiUser>("/users", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function fetchUser(token: string, userId: string) {
  return apiRequest<ApiUser>(`/users/${userId}`, {
    method: "GET",
    token,
  });
}

export async function updateUser(token: string, userId: string, payload: UpdateUserRequest) {
  return apiRequest<ApiUser>(`/users/${userId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function updateUserStatus(
  token: string,
  userId: string,
  payload: UpdateUserStatusRequest,
) {
  return apiRequest<ApiUser>(`/users/${userId}/status`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function resetUserPassword(
  token: string,
  userId: string,
  payload: ResetUserPasswordRequest,
) {
  return apiRequest<{ message: string }>(`/users/${userId}/reset-password`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listFarms(token: string, params: ListParams = {}) {
  return apiRequest<ListResponse<ApiFarm>>("/farms", {
    method: "GET",
    token,
    query: params,
  });
}

export async function listAllFarms(token: string, search?: string) {
  return fetchAllPages(
    (page, limit) =>
      listFarms(token, {
        page,
        limit,
        search,
      }),
  );
}

export async function createFarm(token: string, payload: CreateFarmRequest) {
  return apiRequest<ApiFarm>("/farms", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function fetchFarm(token: string, farmId: string) {
  return apiRequest<ApiFarm>(`/farms/${farmId}`, {
    method: "GET",
    token,
  });
}

export async function updateFarm(token: string, farmId: string, payload: UpdateFarmRequest) {
  return apiRequest<ApiFarm>(`/farms/${farmId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function listBatches(token: string, params: ListParams & { farmId?: string; status?: ApiBatchStatus } = {}) {
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

export async function listTraders(
  token: string,
  params: ListParams = {},
) {
  return apiRequest<ListResponse<ApiTrader>>("/master-data/traders", {
    method: "GET",
    token,
    query: params,
  });
}

export async function listAllTraders(token: string, search?: string) {
  return fetchAllPages(
    (page, limit) =>
      listTraders(token, {
        page,
        limit,
        search,
      }),
  );
}

export async function createTrader(token: string, payload: CreateTraderRequest) {
  return apiRequest<ApiTrader>("/master-data/traders", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateTrader(token: string, traderId: string, payload: UpdateTraderRequest) {
  return apiRequest<ApiTrader>(`/master-data/traders/${traderId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function listCatalogItems(
  token: string,
  params: ListParams & { type?: ApiCatalogItemType } = {},
) {
  return apiRequest<ListResponse<ApiCatalogItem>>("/master-data/catalog-items", {
    method: "GET",
    token,
    query: params,
  });
}

export async function createCatalogItem(token: string, payload: CreateCatalogItemRequest) {
  return apiRequest<ApiCatalogItem>("/master-data/catalog-items", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateCatalogItem(
  token: string,
  itemId: string,
  payload: UpdateCatalogItemRequest,
) {
  return apiRequest<ApiCatalogItem>(`/master-data/catalog-items/${itemId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

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
