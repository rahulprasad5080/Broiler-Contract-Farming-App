import { apiRequest } from "../api";
import { fetchAllPages } from "./pagination";
import type {
  ApiCatalogItem,
  ApiCatalogItemType,
  ApiTrader,
  CreateCatalogItemRequest,
  CreateTraderRequest,
  ListParams,
  ListResponse,
  UpdateCatalogItemRequest,
  UpdateTraderRequest,
} from "./types";

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

/**
 * PUT /api/v1/master-data/catalog-items/{itemId}
 * Update an existing catalog item (name, rate, stock, active flag, etc.).
 * Roles: OWNER, ACCOUNTS, SUPERVISOR
 */
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
