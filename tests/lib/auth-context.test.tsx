import { render, screen, waitFor } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  refreshAccessToken: vi.fn(),
}));

import { api } from "@/lib/api/client";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import type { AuthUser } from "@/lib/types/auth";
import { apiError } from "../pages/products-fixtures";

const mockedGet = api.get as unknown as Mock;

const USER_ID = "44444444-4444-4444-4444-444444444444";
const MARKET_ID = "11111111-1111-1111-1111-111111111111";
const MARKET_SLUG = "mercado-central";

const tenant = {
  id: MARKET_ID,
  marketName: "Mercado Central",
  slug: MARKET_SLUG,
  status: "ACTIVE",
};

function cachedUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: USER_ID,
    name: "Ana Souza",
    email: "ana@email.com",
    roles: [{ id: "r1", name: "OWNER" }],
    permissions: [],
    ...overrides,
  };
}

/** JWT falso (apenas claims, sem assinatura) para sessões sem usuário em cache. */
function fakeAccessToken(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64(claims)}.assinatura-falsa`;
}

function seedSession(options: { user?: AuthUser | null; token?: string }) {
  window.localStorage.clear();
  window.localStorage.setItem(
    "marvi-hub-access-token",
    options.token ?? fakeAccessToken({ sub: USER_ID, context: "hub" }),
  );
  window.localStorage.setItem("marvi-hub-tenant", JSON.stringify(tenant));
  if (options.user !== null) {
    window.localStorage.setItem("marvi-hub-user", JSON.stringify(options.user));
  }
}

interface RouteOptions {
  permissions?: string[];
  permissionsError?: boolean;
  profile?: AuthUser | null;
}

function installGetRoutes(options: RouteOptions = {}) {
  mockedGet.mockImplementation(async (input: string) => {
    if (input.includes("/permissions-by-market")) {
      if (options.permissionsError) {
        throw apiError(403, { error: "FORBIDDEN", message: "Usuário sem permissão." });
      }
      return {
        userId: USER_ID,
        markets: [
          {
            marketId: MARKET_ID,
            marketName: "Mercado Central",
            tenantSlug: MARKET_SLUG,
            permissions: options.permissions ?? [],
          },
        ],
      };
    }
    if (input === "/api/users/me") {
      if (options.profile === null) {
        throw apiError(404, { error: "NOT_FOUND", message: "Rota inexistente." });
      }
      return options.profile;
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function permissionCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter(
      (input) => typeof input === "string" && input.includes("/permissions-by-market"),
    );
}

function PermissionProbe() {
  const { hasPermission } = useAuth();
  return (
    <div>
      <span data-testid="orders-read">{hasPermission("orders:read") ? "SIM" : "NÃO"}</span>
      <span data-testid="user-name">{useAuth().user?.name ?? "—"}</span>
    </div>
  );
}

function renderWithAuth(children?: ReactNode) {
  return render(
    <AuthProvider>
      {children ?? <PermissionProbe />}
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("AuthProvider — verificação de permissões", () => {
  it("usa as permissões do usuário em cache imediatamente após a recarga", async () => {
    seedSession({ user: cachedUser({ permissions: ["orders:read"] }) });
    installGetRoutes({ permissions: ["orders:read"] });
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("orders-read")).toHaveTextContent("SIM");
    });
  });

  it("consulta permissions-by-market do mercado atual ao iniciar a sessão", async () => {
    seedSession({ user: cachedUser() });
    installGetRoutes({ permissions: ["orders:read"] });
    renderWithAuth();

    await waitFor(() => {
      expect(permissionCalls()[0]).toBe(
        `/api/users/${USER_ID}/permissions-by-market?id_market=${MARKET_ID}`,
      );
    });
  });

  it("atualiza as permissões a partir da rota quando mudaram desde o login", async () => {
    // Cache (login antigo) sem orders:read; a rota devolve orders:read.
    seedSession({ user: cachedUser() });
    installGetRoutes({ permissions: ["orders:read"] });
    renderWithAuth();

    expect(screen.getByTestId("orders-read")).toHaveTextContent("NÃO");
    await waitFor(() => {
      expect(screen.getByTestId("orders-read")).toHaveTextContent("SIM");
    });
    // O cache local é atualizado para sobreviver à próxima recarga.
    expect(JSON.parse(window.localStorage.getItem("marvi-hub-user") ?? "{}")).toEqual(
      expect.objectContaining({ permissions: ["orders:read"] }),
    );
  });

  it("mantém as permissões do login quando a rota falha (sem users:manage)", async () => {
    seedSession({ user: cachedUser({ permissions: ["orders:read"] }) });
    installGetRoutes({ permissionsError: true });
    renderWithAuth();

    await waitFor(() => {
      expect(permissionCalls().length).toBe(1);
    });
    expect(screen.getByTestId("orders-read")).toHaveTextContent("SIM");
  });

  it("recupera usuário de sessão antiga pelo token e busca nome/permissões", async () => {
    // Sessão anterior ao cache: apenas token + tenant; sem usuário salvo.
    seedSession({
      user: null,
      token: fakeAccessToken({
        sub: USER_ID,
        email: "ana@email.com",
        roles: ["OWNER"],
        permissions: [],
        context: "hub",
        tenant_slug: MARKET_SLUG,
      }),
    });
    installGetRoutes({
      permissions: ["orders:read"],
      profile: cachedUser({ name: "Ana Souza", permissions: ["orders:read"] }),
    });
    renderWithAuth();

    // Permissões vêm da rota; o nome vem do perfil.
    await waitFor(() => {
      expect(screen.getByTestId("orders-read")).toHaveTextContent("SIM");
    });
    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Ana Souza");
    });
    expect(mockedGet).toHaveBeenCalledWith("/api/users/me");
  });
});
