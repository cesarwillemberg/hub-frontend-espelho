import type { AuthTenant, AuthUser, PendingSelectionData } from "../types/auth";
import { refreshAccessToken } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TOKEN_KEY = "marvi-hub-access-token";
const TENANT_KEY = "marvi-hub-tenant";
const TENANT_SLUG_KEY = "marvi-hub-tenant-slug";
const PENDING_SELECTION_KEY = "marvi-hub-pending-selection";
const USER_KEY = "marvi-hub-user";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getTenant(): AuthTenant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TENANT_KEY);
    return raw ? (JSON.parse(raw) as AuthTenant) : null;
  } catch {
    return null;
  }
}

export function setTenant(tenant: AuthTenant | null): void {
  if (typeof window === "undefined") return;
  if (tenant) {
    localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
  } else {
    localStorage.removeItem(TENANT_KEY);
  }
}

/**
 * Usuário autenticado em cache local.
 *
 * O Core API não expõe um endpoint `/me` com permissões, então o usuário
 * obtido no login é persistido para que verificações de UX (`hasPermission`)
 * continuem funcionando após uma recarga. Trata-se apenas de cache de UX:
 * a autorização real continua sendo aplicada pelo Core API em cada chamada.
 */
export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    return Array.isArray(user.permissions) ? user : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Reconstrói um usuário mínimo a partir dos claims do access token (sem
 * verificação — o token nunca é tratado como fonte de autoridade, o Core API
 * valida tudo a cada chamada). Usado quando existe sessão, mas não há usuário
 * em cache (ex.: login anterior ao cache), permitindo recuperar o `id`
 * necessário para consultar as permissões via
 * `GET /api/users/{userId}/permissions-by-market`.
 */
export function getUserFromAccessToken(token: string): AuthUser | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(atob(payloadPart)) as {
      sub?: unknown;
      email?: unknown;
      roles?: unknown;
      permissions?: unknown;
    };
    if (typeof payload.sub !== "string") return null;
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    return {
      id: payload.sub,
      name: null,
      email: typeof payload.email === "string" ? payload.email : null,
      roles: roles.map((name) => ({ id: String(name), name: String(name) })),
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.map(String)
        : [],
    };
  } catch {
    return null;
  }
}

export function getTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  const tenant = getTenant();
  return tenant?.slug ?? null;
}

export function getTenantSlugFromCache(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT_SLUG_KEY);
}

export function setTenantSlugFromCache(slug: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TENANT_SLUG_KEY, slug);
}

export async function fetchCurrentTenantSlug(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!API_URL) return null;

  async function attempt(token: string | null): Promise<string | null> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/users/me/current-tenant`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken();
      if (newToken) return attempt(newToken);
      return null;
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data?.slug ?? data?.tenant?.slug ?? null;
  }

  try {
    return await attempt(getSessionToken());
  } catch {
    return null;
  }
}

// --- Pending Tenant Selection (sessionStorage) ---

export function setPendingTenantSelection(data: PendingSelectionData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_SELECTION_KEY, JSON.stringify(data));
}

export function getPendingTenantSelection(): PendingSelectionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SELECTION_KEY);
    return raw ? (JSON.parse(raw) as PendingSelectionData) : null;
  } catch {
    return null;
  }
}

export function clearPendingTenantSelection(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_SELECTION_KEY);
}
