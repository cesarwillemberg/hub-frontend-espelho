import {
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  getTenantSlug,
  getTenantSlugFromCache,
  setTenantSlugFromCache,
  fetchCurrentTenantSlug,
} from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL não está definido. Crie um .env.local com NEXT_PUBLIC_API_URL=http://localhost:3001");
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export interface ApiClientOptions {
  headers?: RequestInit["headers"];
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        clearSessionToken();
        return null;
      }
      const data = await res.json();
      const token = data.accessToken as string | undefined;
      if (token) setSessionToken(token);
      return token ?? null;
    } finally {
      refreshPromise = null;
      isRefreshing = false;
    }
  })();
  return refreshPromise;
}

export async function apiClient<T = unknown>(
  input: string,
  init: RequestInit & ApiClientOptions = {},
): Promise<T> {
  const token = getSessionToken();

  const headers: Record<string, string> = {};
  if (init.body !== undefined && init.body !== null) {
    headers["Content-Type"] = "application/json";
  }

  let tenantSlug = getTenantSlug() ?? getTenantSlugFromCache();
  if (!tenantSlug && token) {
    tenantSlug = await fetchCurrentTenantSlug();
    if (tenantSlug) {
      setTenantSlugFromCache(tenantSlug);
    }
  }
  if (tenantSlug) {
    headers["X-Tenant-Slug"] = tenantSlug;
  }
  if (init.headers) {
    const h = init.headers as unknown as Record<string, string>;
    Object.assign(headers, h);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${input}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        return apiClient<T>(input, { ...init, headers });
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null as unknown as T;
    }
  }

  if (!response.ok) {
    const err: any = new Error(`API error: ${response.status}`);
    err.status = response.status;
    try {
      err.data = await response.json();
    } catch {
      err.data = { message: response.statusText };
    }
    throw err;
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}

export const api = {
  get: <T = unknown>(input: string, init?: ApiClientOptions) => apiClient<T>(input, { ...init, method: "GET" }),
  post: <T = unknown>(input: string, body?: unknown, init?: ApiClientOptions) =>
    apiClient<T>(input, { ...init, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(input: string, body?: unknown, init?: ApiClientOptions) =>
    apiClient<T>(input, { ...init, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(input: string, body?: unknown, init?: ApiClientOptions) =>
    apiClient<T>(input, { ...init, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(input: string, init?: ApiClientOptions) =>
    apiClient<T>(input, { ...init, method: "DELETE" }),
};
