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

function getErrorMessage(response: Response, payload: unknown) {
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

  return response.statusText || "Request failed";
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
