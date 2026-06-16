import { apiRequest } from "../api";
import type { ApiWarehouse, CreateWarehouseRequest } from "./types";

export async function listWarehouses(token: string) {
  return apiRequest<{ data: ApiWarehouse[] }>("/inventory/warehouses", {
    method: "GET",
    token,
  });
}

export async function createWarehouse(token: string, payload: CreateWarehouseRequest) {
  return apiRequest<ApiWarehouse>("/inventory/warehouses", {
    method: "POST",
    token,
    body: payload,
  });
}
