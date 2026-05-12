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
