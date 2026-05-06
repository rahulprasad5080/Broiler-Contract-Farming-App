import { apiRequest } from "./api";

export type ApiRole = "OWNER" | "SUPERVISOR" | "FARMER";
export type ApiUserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type ApiFarmStatus = "ACTIVE" | "INACTIVE";
export type ApiBatchStatus = "ACTIVE" | "CANCELLED" | "PLANNED" | "READY_FOR_SALE" | "CLOSED";
export type ApiSaleStatus = "CANCELLED" | "DRAFT" | "CONFIRMED";
export type ApiTreatmentKind = "OTHER" | "VACCINATION" | "MEDICATION";
export type ApiCostCategory =
  | "FEED"
  | "VACCINE"
  | "MEDICINE"
  | "OTHER"
  | "CHICK_PURCHASE"
  | "LABOUR"
  | "UTILITIES"
  | "TRANSPORT"
  | "MAINTENANCE";

export type ApiCatalogItemType = "FEED" | "VACCINE" | "MEDICINE" | "OTHER";
export type ApiCommentTargetType = "FARM" | "BATCH" | "DAILY_LOG" | "TREATMENT" | "COST" | "SALE";

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
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
  kind: ApiTreatmentKind;
  catalogItemId?: string | null;
  treatmentDate: string;
  quantity?: number | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiCatalogItem = {
  id: string;
  organizationId: string;
  name: string;
  type: ApiCatalogItemType;
  unit?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiCost = {
  id: string;
  organizationId: string;
  batchId: string;
  category: ApiCostCategory;
  catalogItemId?: string | null;
  costDate: string;
  amount: number;
  quantity?: number | null;
  unitRate?: number | null;
  notes?: string | null;
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
  unit?: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateCatalogItemRequest = Partial<CreateCatalogItemRequest>;

export type CreateCostRequest = {
  category: ApiCostCategory;
  catalogItemId?: string;
  costDate: string;
  amount: number;
  quantity?: number;
  unitRate?: number;
  notes?: string;
  clientReferenceId?: string;
};

export type CreateTreatmentRequest = {
  kind: ApiTreatmentKind;
  catalogItemId?: string;
  treatmentDate: string;
  quantity?: number;
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

export async function listBatchCosts(token: string, batchId: string) {
  return apiRequest<ListResponse<ApiCost>>(`/batches/${batchId}/costs`, {
    method: "GET",
    token,
  });
}

export async function createBatchCost(token: string, batchId: string, payload: CreateCostRequest) {
  return apiRequest<ApiCost>(`/batches/${batchId}/costs`, {
    method: "POST",
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
