import {
  clearStoredSession,
  getStoredSession,
  persistStoredSession,
} from "./authSession";
import type { AuthSession } from "./authTypes";
import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type Method,
} from "axios";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://boiler-backend-production.up.railway.app/api/v1";

export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 30000);
const DEFAULT_RETRY_COUNT = Number(process.env.EXPO_PUBLIC_API_RETRY_COUNT ?? 2);

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: Method;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  responseType?: AxiosRequestConfig["responseType"];
  retry?: number;
};

let refreshPromise: Promise<AuthSession | null> | null = null;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const supportClient: AxiosInstance = axios.create({
  baseURL: API_ROOT_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  config.headers.set("Accept", "application/json");

  if (config.data !== undefined) {
    config.headers.set("Content-Type", "application/json");
  }

  return config;
});

function collectTextMessages(value: unknown): string[] {
  if (typeof value === "string") {
    const message = value.trim();
    return message ? [message] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextMessages(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const priorityKeys = ["message", "msg", "error"];
    const priorityMessages = priorityKeys.flatMap((key) => collectTextMessages(record[key]));
    const nestedMessages = Object.entries(record)
      .filter(([key]) => !priorityKeys.includes(key))
      .flatMap(([, nestedValue]) => collectTextMessages(nestedValue));

    return [...priorityMessages, ...nestedMessages];
  }

  return [];
}

function uniqueMessages(messages: string[]) {
  return Array.from(
    new Set(
      messages
        .map((message) => message.trim())
        .filter(Boolean),
    ),
  );
}

function isGenericErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === "validation failed" ||
    normalized === "bad request" ||
    normalized === "request failed"
  );
}

function getErrorMessage(statusText: string | undefined, payload: unknown) {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;

    const detailMessages = uniqueMessages([
      ...collectTextMessages(p.details),
      ...collectTextMessages(p.fields),
    ]);
    if (
      detailMessages.length > 0 &&
      (typeof p.message !== "string" || isGenericErrorMessage(p.message))
    ) {
      return detailMessages.join(", ");
    }

    const errorMessages = uniqueMessages(collectTextMessages(p.errors));
    if (errorMessages.length > 0) {
      return errorMessages.join(", ");
    }

    if (Array.isArray(p.message)) {
      const messageList = uniqueMessages(collectTextMessages(p.message));
      if (messageList.length > 0) {
        return messageList.join(", ");
      }
    }

    if (typeof p.message === "string" && p.message.trim()) {
      return p.message;
    }

    if (typeof p.error === "string" && p.error.trim()) {
      return p.error;
    }
  }

  return statusText || "Request failed";
}

function getPayloadFromAxiosError(error: AxiosError) {
  return error.response?.data ?? {
    cause: error.message || "Unable to reach the server.",
  };
}

function getStatusFromAxiosError(error: AxiosError) {
  return error.response?.status ?? 0;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const payload = getPayloadFromAxiosError(error);
    const status = getStatusFromAxiosError(error);

    if (!error.response) {
      return new ApiError(
        "Unable to reach the server. Check your internet connection and try again.",
        status,
        payload,
      );
    }

    return new ApiError(
      getErrorMessage(error.response.statusText, payload),
      status,
      payload,
    );
  }

  const fallbackMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Request failed";

  return new ApiError(fallbackMessage, 0, { cause: fallbackMessage });
}

function shouldRetry(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return error.response.status >= 500;
}

function buildHeaders(token?: string | null, headers?: RequestOptions["headers"]) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers ?? {}),
  };
}

async function requestWithRetry<T = unknown>(
  client: AxiosInstance,
  path: string,
  options: RequestOptions = {},
) {
  const retries = options.retry ?? DEFAULT_RETRY_COUNT;
  let attempt = 0;

  while (true) {
    try {
      return await client.request<T>({
        url: path,
        method: options.method ?? "GET",
        params: options.query,
        data: options.body,
        headers: buildHeaders(options.token, options.headers),
        responseType: options.responseType,
      });
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
}

async function refreshStoredSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const currentSession = await getStoredSession();

      if (!currentSession?.tokens.refreshToken) {
        await clearStoredSession();
        return null;
      }

      let response: AxiosResponse<LoginResponseShape>;

      try {
        response = await requestWithRetry<LoginResponseShape>(apiClient, "/auth/refresh", {
          method: "POST",
          body: {
            refreshToken: currentSession.tokens.refreshToken,
          },
          retry: 0,
        });
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.status === 401 || apiError.status === 403) {
          await clearStoredSession();
        }

        throw apiError;
      }

      const nextSession = response.data as AuthSession;
      await persistStoredSession(nextSession);
      return nextSession;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

type LoginResponseShape = AuthSession;

async function performRequest(
  path: string,
  options: RequestOptions = {},
  client: AxiosInstance = apiClient,
  allowAuthRetry = true,
) {
  try {
    return await requestWithRetry(client, path, options);
  } catch (error) {
    if (
      client === apiClient &&
      allowAuthRetry &&
      options.token &&
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/refresh" &&
      path !== "/auth/logout"
    ) {
      const refreshedSession = await refreshStoredSession();

      if (refreshedSession?.tokens.accessToken) {
        return performRequest(
          path,
          {
            ...options,
            token: refreshedSession.tokens.accessToken,
          },
          client,
          false,
        );
      }
    }

    const apiError = toApiError(error);

    if (apiError.status === 401 || apiError.status === 403) {
      const storedSession = await getStoredSession();
      if (storedSession && path === "/auth/refresh") {
        await clearStoredSession();
      }
    }

    throw apiError;
  }
}

export async function apiRequest<T>(
  path: string,
  { body, token, headers, query, ...init }: RequestOptions = {},
): Promise<T> {
  const response = await performRequest(path, {
    body,
    token,
    headers,
    query,
    ...init,
  });

  return response.data as T;
}

export async function apiRawRequest(
  path: string,
  options: RequestOptions = {},
  baseUrl = API_BASE_URL,
) {
  const client = baseUrl === API_ROOT_URL ? supportClient : apiClient;
  const response = (await performRequest(path, {
    ...options,
    responseType: options.responseType ?? "blob",
  }, client)) as AxiosResponse<Blob | ArrayBuffer | string>;

  const headers = new Headers();
  Object.entries(response.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
      return;
    }

    if (value !== undefined) {
      headers.set(key, String(value));
    }
  });

  return new Response(response.data, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
