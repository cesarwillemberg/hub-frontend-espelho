"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "../api/client";
import {
  clearSessionToken,
  getSessionToken,
  getTenant,
  setSessionToken,
  setTenant,
  setPendingTenantSelection,
  getPendingTenantSelection,
  clearPendingTenantSelection,
  getCachedUser,
  setCachedUser,
  getUserFromAccessToken,
} from "../api/session";
import type {
  AuthState,
  AuthTenant,
  AuthUser,
  LoginCredentials,
  LoginResult,
  PendingSelectionData,
  RegisterData,
  UserPermissionsByMarket,
  UserTenantSummary,
} from "../types/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<LoginResult>;
  selectTenant: (selectionToken: string, tenantId: string) => Promise<LoginResult>;
  switchTenant: (tenantId: string) => Promise<LoginResult>;
  listMyTenants: () => Promise<UserTenantSummary[]>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  setPendingSelection: (data: PendingSelectionData | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    loading: true,
    pendingSelection: null,
  });

  /**
   * Verifica as permissões efetivas do usuário no mercado atual através de
   * `GET /api/users/{userId}/permissions-by-market?id_market={marketId}`
   * (BFF → Core API). Atualiza o estado e o cache local com o retorno.
   *
   * Observação: o Core exige `users:manage` nessa rota, então usuários sem
   * essa permissão recebem 403 — nesse caso mantemos as permissões obtidas no
   * login (cache), que continuam válidas para fins de UX. A autorização real
   * é sempre aplicada pelo Core API em cada chamada.
   */
  const refreshPermissions = useCallback(
    async (
      userArg?: AuthUser | null,
      tenantArg?: AuthTenant | null,
    ): Promise<void> => {
      const user = userArg ?? getCachedUser();
      const tenant = tenantArg ?? getTenant();
      if (!user?.id || !tenant?.id) return;
      try {
        const data = await api.get<UserPermissionsByMarket>(
          `/api/users/${user.id}/permissions-by-market?id_market=${tenant.id}`,
        );
        const market =
          data.markets?.find((entry) => entry.marketId === tenant.id) ??
          data.markets?.[0];
        if (!market) return;
        const updated: AuthUser = {
          ...user,
          permissions: market.permissions ?? [],
        };
        setCachedUser(updated);
        setState((prev) => ({ ...prev, user: updated }));
      } catch {
        // Sem users:manage, indisponibilidade etc.: mantém as permissões já
        // conhecidas (login/cache) em vez de bloquear a interface.
      }
    },
    [],
  );

  useEffect(() => {
    const token = getSessionToken();
    if (token) {
      // Usuário já fez login anteriormente; considerar autenticado imediatamente
      // para evitar tela em branco durante a validação assíncrona.
      const savedTenant = getTenant();
      const pending = getPendingTenantSelection();
      // Sessão criada antes do cache de usuário: reconstrói um usuário mínimo
      // a partir do access token para não perder as verificações de permissão.
      const savedUser = getCachedUser() ?? getUserFromAccessToken(token);
      if (savedUser) setCachedUser(savedUser);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((prev) => ({
        ...prev,
        user: savedUser ?? prev.user,
        isAuthenticated: true,
        loading: false,
        tenant: savedTenant ?? prev.tenant,
        pendingSelection: pending ?? prev.pendingSelection,
      }));
      // Verifica as permissões efetivas do usuário no mercado atual, que podem
      // ter mudado desde o login (o cache acima guarda o valor do login).
      if (savedUser) {
        void refreshPermissions(savedUser, savedTenant);
      }
    } else {
      const pending = getPendingTenantSelection();
      setState((prev) => ({ ...prev, loading: false, pendingSelection: pending ?? prev.pendingSelection }));
    }
  }, [refreshPermissions]);

  // Busca o nome real quando a sessão só tem dados mínimos no token/cache ou
  // recebeu um nome genérico da API. Também cobre login e troca de mercado.
  useEffect(() => {
    if (!state.isAuthenticated || !needsUserName(state.user?.name)) return;

    let cancelled = false;
    void api
      .get<AuthUser>("/api/users/me")
      .then((profile) => {
        if (cancelled || !profile?.name?.trim()) return;

        const latestToken = getSessionToken();
        if (!latestToken) return;
        const latestUser = getUserFromAccessToken(latestToken);
        if (latestUser?.id && profile.id !== latestUser.id) return;

        const currentUser: AuthUser = {
          ...profile,
          name: profile.name.trim(),
          permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
        };
        setCachedUser(currentUser);
        setState((prev) =>
          prev.isAuthenticated ? { ...prev, user: currentUser } : prev,
        );
      })
      .catch(() => {
        // Mantém os dados recuperáveis do token se o perfil estiver indisponível.
      });

    return () => {
      cancelled = true;
    };
  }, [state.isAuthenticated, state.user?.id, state.user?.name]);

  /**
   * Persiste token, tenant e usuário após um fluxo de autenticação bem-sucedido.
   * O usuário fica em cache para que `hasPermission` funcione após recargas.
   */
  const persistSession = useCallback(
    (res: { user: AuthUser; tenant: AuthTenant; accessToken: string }) => {
      setSessionToken(res.accessToken);
      setTenant(res.tenant);
      setCachedUser(res.user);
    },
    [],
  );

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      const res = await api.post<LoginResult>("/api/auth/login", credentials);
      if (res && "accessToken" in res) {
        persistSession(res);
        setState({
          user: res.user,
          tenant: res.tenant,
          isAuthenticated: true,
          loading: false,
          pendingSelection: null,
        });
      }
      return res;
    },
    [persistSession],
  );

  const register = useCallback(
    async (data: RegisterData): Promise<LoginResult> => {
      const res = await api.post<LoginResult>("/api/auth/register", data);
      if (res && "accessToken" in res) {
        persistSession(res);
        setState({
          user: res.user,
          tenant: res.tenant,
          isAuthenticated: true,
          loading: false,
          pendingSelection: null,
        });
      }
      return res;
    },
    [persistSession],
  );

  const selectTenant = useCallback(
    async (selectionToken: string, tenantId: string): Promise<LoginResult> => {
      const res = await api.post<LoginResult>("/api/auth/select-tenant", {
        selectionToken,
        tenantId,
      });
      if (res && "accessToken" in res) {
        persistSession(res);
        setState({
          user: res.user as AuthUser,
          tenant: res.tenant,
          isAuthenticated: true,
          loading: false,
          pendingSelection: null,
        });
      }
      return res;
    },
    [persistSession],
  );

  const switchTenant = useCallback(
    async (tenantId: string): Promise<LoginResult> => {
      const res = await api.post<LoginResult>("/api/auth/switch-tenant", {
        tenantId,
      });
      if (res && "accessToken" in res) {
        persistSession(res);
        setState({
          user: res.user as AuthUser,
          tenant: res.tenant,
          isAuthenticated: true,
          loading: false,
          pendingSelection: null,
        });
      }
      return res;
    },
    [persistSession],
  );

  const listMyTenants = useCallback(async (): Promise<UserTenantSummary[]> => {
    const res = await api.get<UserTenantSummary[]>("/api/users/me/tenants");
    return Array.isArray(res)
      ? res
      : (res as unknown as { tenants?: UserTenantSummary[] })?.tenants ?? [];
  }, []);

  const setPendingSelection = useCallback((data: PendingSelectionData | null): void => {
    setState((prev) => ({ ...prev, pendingSelection: data }));
    if (data) {
      setPendingTenantSelection(data);
    } else {
      clearPendingTenantSelection();
    }
  }, []);

  // Declarado antes de `refreshToken` porque é usado por ele — evita acesso
  // antes da declaração e mantém a memoização válida.
  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Ignorar erro de logout na API; ainda limpamos localmente
    }
    clearSessionToken();
    setTenant(null);
    setCachedUser(null);
    clearPendingTenantSelection();
    setState({ user: null, tenant: null, isAuthenticated: false, loading: false, pendingSelection: null });
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api.post<{ accessToken: string }>("/api/auth/refresh");
      if (res && res.accessToken) {
        setSessionToken(res.accessToken);
        setState((prev) => ({ ...prev, isAuthenticated: true }));
        return true;
      }
      return false;
    } catch {
      await logout();
      return false;
    }
  }, [logout]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return state.user?.permissions.includes(permission) ?? false;
    },
    [state.user],
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      return state.user?.roles.some((r) => r.name === roleName) ?? false;
    },
    [state.user],
  );

  const value: AuthContextType = {
    ...state,
    login,
    register,
    selectTenant,
    switchTenant,
    listMyTenants,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    setPendingSelection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}

function needsUserName(name: string | null | undefined): boolean {
  const normalized = name?.trim().toLocaleLowerCase("pt-BR") ?? "";
  return !normalized || ["usuário", "usuario", "user"].includes(normalized);
}
