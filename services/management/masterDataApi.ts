import { apiRequest } from "../api";
import { fetchAllPages } from "./pagination";
import { normalizeTypeOptionDropdown } from "./typeOptionUtils";
import type {
  ApiCatalogItem,
  ApiCatalogItemType,
  ApiMasterDataTypeOption,
  ApiTrader,
  ApiVendor,
  CreateCatalogItemRequest,
  CreateMasterDataTypeOptionRequest,
  CreateTraderRequest,
  CreateVendorRequest,
  ListParams,
  ListResponse,
  MasterDataTypeCategory,
  UpdateCatalogItemRequest,
  UpdateMasterDataTypeOptionRequest,
  UpdateTraderRequest,
  UpdateVendorRequest,
} from "./types";

export type TypeOptionListParams = ListParams & {
  category?: MasterDataTypeCategory;
  includeInactive?: boolean;
};

export type TypeOptionDropdownParams = {
  category: MasterDataTypeCategory;
  search?: string;
  limit?: number;
  includeInactive?: boolean;
};

export async function listMasterDataTypeOptions(
  token: string,
  params: TypeOptionListParams = {},
) {
  return apiRequest<ListResponse<ApiMasterDataTypeOption>>("/master-data/type-options", {
    method: "GET",
    token,
    query: params,
  });
}

export async function listMasterDataTypeOptionDropdown(
  token: string,
  params: TypeOptionDropdownParams,
) {
  const response = await apiRequest<unknown>("/master-data/type-options/dropdown", {
    method: "GET",
    token,
    query: params,
  });

  return normalizeTypeOptionDropdown(params.category, response);
}

export async function createMasterDataTypeOption(
  token: string,
  payload: CreateMasterDataTypeOptionRequest,
) {
  return apiRequest<ApiMasterDataTypeOption>("/master-data/type-options", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateMasterDataTypeOption(
  token: string,
  optionId: string,
  payload: UpdateMasterDataTypeOptionRequest,
) {
  return apiRequest<ApiMasterDataTypeOption>(`/master-data/type-options/${optionId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

// ─────────────────────────────────────────────
// Traders
// ─────────────────────────────────────────────

/**
 * GET /api/v1/master-data/traders
 * Paginated list of traders used during sale entry.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR, FARMER
 */
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

/**
 * Convenience helper: fetches all trader pages in parallel and returns a
 * single flattened ListResponse.
 */
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

/**
 * POST /api/v1/master-data/traders
 * Create a new trader master record.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
export async function createTrader(token: string, payload: CreateTraderRequest) {
  return apiRequest<ApiTrader>("/master-data/traders", {
    method: "POST",
    token,
    body: payload,
  });
}

/**
 * PUT /api/v1/master-data/traders/{traderId}
 * Update an existing trader record.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
export async function updateTrader(token: string, traderId: string, payload: UpdateTraderRequest) {
  return apiRequest<ApiTrader>(`/master-data/traders/${traderId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

/**
 * GET /api/v1/master-data/vendors
 * Paginated list of vendors used by purchase entry, vendor payments, and ledgers.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR, FARMER
 */
export async function listVendors(
  token: string,
  params: ListParams = {},
) {
  return apiRequest<ListResponse<ApiVendor>>("/master-data/vendors", {
    method: "GET",
    token,
    query: params,
  });
}

/**
 * Convenience helper: fetches all vendor pages and returns a single flattened
 * ListResponse.
 */
export async function listAllVendors(token: string, search?: string) {
  return fetchAllPages(
    (page, limit) =>
      listVendors(token, {
        page,
        limit,
        search,
      }),
  );
}

/**
 * POST /api/v1/master-data/vendors
 * Create a new vendor master record.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
export async function createVendor(token: string, payload: CreateVendorRequest) {
  return apiRequest<ApiVendor>("/master-data/vendors", {
    method: "POST",
    token,
    body: payload,
  });
}

/**
 * PUT /api/v1/master-data/vendors/{vendorId}
 * Update an existing vendor record.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
export async function updateVendor(token: string, vendorId: string, payload: UpdateVendorRequest) {
  return apiRequest<ApiVendor>(`/master-data/vendors/${vendorId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

// ─────────────────────────────────────────────
// Catalog Items
// ─────────────────────────────────────────────

/**
 * GET /api/v1/master-data/catalog-items
 * Paginated list of feed, vaccine, medicine, chicks, equipment, and other
 * reusable catalog items. Supports optional `type` filter.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR, FARMER
 */
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

/**
 * Convenience helper: fetches all catalog-item pages in parallel and returns
 * a single flattened ListResponse. Optional `type` filter is preserved across
 * all pages.
 */
export async function listAllCatalogItems(
  token: string,
  type?: ApiCatalogItemType,
  search?: string,
) {
  return fetchAllPages(
    (page, limit) =>
      listCatalogItems(token, {
        page,
        limit,
        search,
        ...(type ? { type } : {}),
      }),
  );
}

/**
 * POST /api/v1/master-data/catalog-items
 * Create a new catalog item.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
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

/**
 * DELETE /api/v1/master-data/catalog-items/{itemId}
 * Delete an unused catalog item.
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
export async function deleteCatalogItem(
  token: string,
  itemId: string,
) {
  return apiRequest<void>(`/master-data/catalog-items/${itemId}`, {
    method: "DELETE",
    token,
  });
}

