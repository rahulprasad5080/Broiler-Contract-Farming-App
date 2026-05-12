import { apiRawRequest, API_ROOT_URL } from "./api";

export type ApiHealthResponse = {
  name?: string;
  environment?: string;
  uptimeSeconds?: number;
  timestamp?: string;
};

export async function fetchHealth() {
  const response = await apiRawRequest(
    "/health",
    { method: "GET", responseType: "text" },
    API_ROOT_URL,
  );
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as ApiHealthResponse;
}

export async function fetchDocsHtml() {
  const response = await apiRawRequest(
    "/docs",
    { method: "GET", responseType: "text" },
    API_ROOT_URL,
  );
  return response.text();
}
