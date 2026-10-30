export interface AuthUser {
  id: string | null;
  name: string | null;
  email: string | null;
  roles: Array<{ id: string; name: string }>;
  permissions: string[];
}

export interface AuthTenant {
  id: string;
  marketName: string;
  slug: string;
  status: string;
  setupComplete?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isAuthenticated: boolean;
  loading: boolean;
  pendingSelection: PendingSelectionData | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  marketName: string;
  slug?: string;
  documentNumber: string;
  contactEmail: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface UserTenantSummary {
  id: string;
  marketName: string;
  tenantSlug: string;
  documentNumber?: string;
  activeTenant: boolean;
  roles: string[];
}

/** Permissões efetivas de um usuário em um mercado específico. */
export interface UserMarketPermissions {
  marketId: string;
  marketName: string;
  tenantSlug: string;
  permissions: string[];
}

/** Resposta de `GET /api/users/{userId}/permissions-by-market` (via BFF). */
export interface UserPermissionsByMarket {
  userId: string;
  markets: UserMarketPermissions[];
}

export interface PendingSelectionData {
  selectionToken: string;
  user: { id: string; name: string; email: string };
  tenants: UserTenantSummary[];
}

export interface TenantSelection {
  status: "TENANT_SELECTION_REQUIRED";
  selectionToken: string;
  user: { id: string; name: string; email: string };
  tenants: UserTenantSummary[];
}

export type LoginResult =
  | {
      user: AuthUser;
      tenant: AuthTenant;
      accessToken: string;
    }
  | TenantSelection;
