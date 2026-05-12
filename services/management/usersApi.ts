import { apiRequest } from "../api";
import { fetchAllPages } from "./pagination";
import type {
  ApiUser,
  CreateUserRequest,
  ListParams,
  ListResponse,
  ResetUserPasswordRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
} from "./types";

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
