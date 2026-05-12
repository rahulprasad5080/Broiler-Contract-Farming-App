import { apiRequest } from "../api";
import { fetchAllPages } from "./pagination";
import type {
  ApiFarm,
  CreateFarmRequest,
  ListParams,
  ListResponse,
  UpdateFarmRequest,
} from "./types";

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
