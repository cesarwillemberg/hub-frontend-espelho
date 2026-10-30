import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  permissions: ["orders:read", "orders:update", "orders:cancel"],
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      name: "Ana",
      email: "ana@email.com",
      roles: [],
      permissions: mocks.permissions,
    },
    isAuthenticated: true,
    hasPermission: (permission: string) =>
      mocks.permissions.includes(permission),
    hasRole: () => true,
  }),
}));

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
import OrdersPage from "@/app/(dashboard)/orders/page";
import {
  apiError,
  orderDetails,
  orderPending,
  ordersPage,
} from "./orders-fixtures";

const mockedGet = api.get as unknown as Mock;

function installGetRoutes(options: { detail?: typeof orderDetails | "error" } = {}) {
  mockedGet.mockImplementation(async (input: string) => {
    if (input.startsWith("/api/orders?")) {
      return ordersPage([orderPending]);
    }
    if (input.startsWith(`/api/orders/${orderPending.id}`)) {
      if (options.detail === "error") {
        throw apiError(500, { error: "INTERNAL", message: "Falha ao carregar o pedido" });
      }
      return options.detail ?? orderDetails;
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function detailCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter(
      (input) =>
        typeof input === "string" &&
        input.startsWith(`/api/orders/${orderPending.id}`),
    );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchParams = new URLSearchParams();
  mocks.permissions = ["orders:read", "orders:update", "orders:cancel"];
  installGetRoutes();
});

describe("OrdersPage — detalhe do pedido", () => {
  it("abre o detalhe pelo identificador ao clicar em Detalhes", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Detalhes do pedido PED-0001" }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(detailCalls()).toContain(`/api/orders/${orderPending.id}`);
    });
  });

  it("exibe cliente, itens, totais, endereço e observações do detalhe", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Detalhes do pedido PED-0001" }),
    );
    const dialog = await screen.findByRole("dialog");
    const content = within(dialog);

    // Identificação e status
    expect(content.getByText("Pedido PED-0001")).toBeInTheDocument();
    // Dados do cliente
    expect(content.getByText("Maria Souza")).toBeInTheDocument();
    expect(content.getByText("maria@email.com")).toBeInTheDocument();
    // Itens
    expect(content.getByText("Arroz Branco 5kg")).toBeInTheDocument();
    expect(content.getByText("Feijão Carioca 1kg")).toBeInTheDocument();
    expect(content.getByText("ARR-5KG")).toBeInTheDocument();
    // Totais — "R$ 50,00", "R$ 53,00" etc.
    expect(content.getByText("R$ 50,00")).toBeInTheDocument();
    expect(content.getByText("R$ 8,00")).toBeInTheDocument();
    expect(content.getByText("R$ 53,00")).toBeInTheDocument();
    // Endereço e observações
    expect(content.getByText("Rua A, 123")).toBeInTheDocument();
    expect(content.getByText(/Entregar no portão/)).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it("exibe erro com tentar novamente quando o detalhe falha", async () => {
    installGetRoutes({ detail: "error" });
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Detalhes do pedido PED-0001" }),
    );

    expect(
      await screen.findByText("Falha ao carregar o pedido"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => {
      expect(detailCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("fecha o detalhe e mantém a listagem", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Detalhes do pedido PED-0001" }),
    );
    await screen.findByRole("dialog");

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("PED-0001")).toBeInTheDocument();
  });
});
