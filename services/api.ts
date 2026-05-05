import {
  clearStoredSession,
  getStoredSession,
  persistStoredSession,
} from "./authSession";
import type { AuthSession } from "./authTypes";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://boiler-backend-production.up.railway.app/api/v1";

export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

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

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

let refreshPromise: Promise<AuthSession | null> | null = null;

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${baseUrl}${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url;
}

function getErrorMessage(response: Response, payload: unknown) {
  return (
    (payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
      ? String((payload as { message: string }).message)
      : response.statusText) || "Request failed"
  );
}

async function fetchWithBase(
  baseUrl: string,
  path: string,
  { body, token, headers, query, ...init }: RequestOptions = {},
) {
  try {
    return await fetch(buildUrl(baseUrl, path, query).toString(), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const fallbackMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Unable to reach the server.";

    throw new ApiError(
      "Unable to reach the server. Check your internet connection and try again.",
      0,
      { cause: fallbackMessage },
    );
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

      const response = await fetchWithBase(API_BASE_URL, "/auth/refresh", {
        method: "POST",
        body: {
          refreshToken: currentSession.tokens.refreshToken,
        },
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await clearStoredSession();
        }

        throw new ApiError(getErrorMessage(response, payload), response.status, payload);
      }

      const nextSession = payload as AuthSession;
      await persistStoredSession(nextSession);
      return nextSession;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function performRequest(
  path: string,
  options: RequestOptions = {},
  baseUrl = API_BASE_URL,
  allowAuthRetry = true,
) {
  const response = await fetchWithBase(baseUrl, path, options);

  if (
    baseUrl === API_BASE_URL &&
    allowAuthRetry &&
    options.token &&
    response.status === 401 &&
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
        baseUrl,
        false,
      );
    }
  }

  return response;
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
  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(response, payload), response.status, payload);
  }

  return payload as T;
}

export async function apiRawRequest(
  path: string,
  options: RequestOptions = {},
  baseUrl = API_BASE_URL,
) {
  const response = await performRequest(path, options, baseUrl);

  if (!response.ok) {
    const payload = await parseResponse(response);
    throw new ApiError(getErrorMessage(response, payload), response.status, payload);
  }

  return response;
}
