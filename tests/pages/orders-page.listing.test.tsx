import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  orderCancelled,
  orderDelivered,
  orderPending,
  orderPreparing,
  orderShipped,
  ordersPage,
} from "./orders-fixtures";
import type { OrderPageResponse } from "@/lib/types/order";

const mockedGet = api.get as unknown as Mock;

interface RouteOptions {
  orders?: OrderPageResponse | "error";
}

function installGetRoutes(options: RouteOptions = {}) {
  mockedGet.mockImplementation(async (input: string) => {
    if (input.startsWith("/api/orders?")) {
      if (options.orders === "error") {
        throw apiError(500, { error: "INTERNAL", message: "Falha ao carregar pedidos" });
      }
      return options.orders ?? ordersPage([]);
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function orderListCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter((input) => typeof input === "string" && input.startsWith("/api/orders?"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchParams = new URLSearchParams();
  mocks.permissions = ["orders:read", "orders:update", "orders:cancel"];
});

describe("OrdersPage — listagem", () => {
  it("renderiza pedidos com número, cliente, status, itens, total e data", async () => {
    installGetRoutes({
      orders: ordersPage([orderPending, orderPreparing]),
    });
    render(<OrdersPage />);

    expect(await screen.findByText("PED-0001")).toBeInTheDocument();
    expect(screen.getByText("PED-0002")).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("João Lima")).toBeInTheDocument();
    expect(screen.getByText("maria@email.com")).toBeInTheDocument();
    // O badge de status fica na linha do pedido (o mesmo texto existe nas
    // opções do filtro de status).
    const pendingRow = screen.getByText("PED-0001").closest("tr") as HTMLElement;
    const preparingRow = screen.getByText("PED-0002").closest("tr") as HTMLElement;
    expect(within(pendingRow).getAllByText("Pendente").length).toBeGreaterThan(0);
    expect(within(preparingRow).getAllByText("Preparando").length).toBeGreaterThan(0);
    // Intl pt-BR usa espaço inseparável entre "R$" e o valor; o normalizer do
    // testing-library converte esse espaço para um espaço comum.
    expect(screen.getByText("R$ 53,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 29,90")).toBeInTheDocument();
    expect(screen.getByText("Exibindo 2 de 2 pedidos")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum pedido encontrado")).not.toBeInTheDocument();
  });

  it("não depende de campos ausentes no resumo: exibe e-mail ou telefone", async () => {
    installGetRoutes({
      orders: ordersPage([orderShipped]),
    });
    render(<OrdersPage />);

    expect(await screen.findByText("Ana Pereira")).toBeInTheDocument();
    expect(screen.getByText("1188887777")).toBeInTheDocument();
  });

  it("exibe estado vazio quando não há pedidos", async () => {
    installGetRoutes({ orders: ordersPage([]) });
    render(<OrdersPage />);

    expect(await screen.findByText("Nenhum pedido encontrado")).toBeInTheDocument();
    expect(screen.getByText("Exibindo 0 de 0 pedidos")).toBeInTheDocument();
  });

  it("exibe erro da listagem com botão de tentar novamente", async () => {
    installGetRoutes({ orders: "error" });
    render(<OrdersPage />);

    expect(await screen.findByText("Falha ao carregar pedidos")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => {
      expect(orderListCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("não carrega a listagem e exibe acesso negado sem orders:read", async () => {
    mocks.permissions = [];
    installGetRoutes({ orders: ordersPage([orderPending]) });
    render(<OrdersPage />);

    expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
    expect(
      screen.getByText(/orders:read/),
    ).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

describe("OrdersPage — busca e filtros", () => {
  it("aplica a busca com debounce e reinicia a página", async () => {
    installGetRoutes({
      orders: ordersPage([orderPending], 25, 3),
    });
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=1&size=10");
    });

    await userEvent.type(screen.getByLabelText("Buscar pedidos"), "maria");
    await waitFor(
      () => {
        expect(orderListCalls()).toContain("/api/orders?page=0&size=10&search=maria");
      },
      { timeout: 3000 },
    );
  });

  it("filtra por status selecionado", async () => {
    installGetRoutes({ orders: ordersPage([orderPending]) });
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por status"), "PENDING");
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=0&size=10&status=PENDING");
    });
  });

  it("filtra por período, encaminhando dateFrom e dateTo", async () => {
    installGetRoutes({ orders: ordersPage([orderPending]) });
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar pedidos a partir de"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Filtrar pedidos até"), {
      target: { value: "2026-10-18" },
    });

    await waitFor(() => {
      expect(orderListCalls()).toContain(
        "/api/orders?page=0&size=10&dateFrom=2026-10-01&dateTo=2026-10-18",
      );
    });

    expect(
      screen.getByRole("button", { name: "Limpar filtros" }),
    ).toBeInTheDocument();
  });

  it("limpa todos os filtros de uma vez", async () => {
    installGetRoutes({ orders: ordersPage([orderPending]) });
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar pedidos a partir de"), {
      target: { value: "2026-10-01" },
    });
    await waitFor(() => {
      expect(orderListCalls()).toContain(
        "/api/orders?page=0&size=10&dateFrom=2026-10-01",
      );
    });

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=0&size=10");
    });
  });

  it("usa o status recebido pela querystring (deep link do dashboard)", async () => {
    mocks.searchParams = new URLSearchParams("status=PENDING");
    installGetRoutes({ orders: ordersPage([orderPending]) });
    render(<OrdersPage />);

    await waitFor(() => {
      expect(orderListCalls()[0]).toBe("/api/orders?page=0&size=10&status=PENDING");
    });
    // O select reflete o status vindo da URL.
    expect(screen.getByLabelText("Filtrar por status")).toHaveValue("PENDING");
  });
});

describe("OrdersPage — paginação", () => {
  it("navega entre páginas de pedidos", async () => {
    installGetRoutes({ orders: ordersPage([orderPending], 25, 3) });
    render(<OrdersPage />);

    expect(await screen.findByText("Exibindo 1 de 25 pedidos")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=1&size=10");
    });
    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=0&size=10");
    });
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("desabilita a paginação quando não há páginas", async () => {
    installGetRoutes({ orders: ordersPage([]) });
    render(<OrdersPage />);

    expect(await screen.findByText("Nenhum pedido encontrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    expect(screen.getByText("Página 0 de 1")).toBeInTheDocument();
  });

  it("recarrega uma página válida quando a atual deixa de existir", async () => {
    let ordersResponse = ordersPage([orderPending], 25, 3);
    mockedGet.mockImplementation(async (input: string) => {
      if (input.startsWith("/api/orders?")) {
        return ordersResponse;
      }
      throw new Error(`GET inesperado: ${input}`);
    });

    render(<OrdersPage />);
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();

    // A lista encolhe: a página 2 passa a não existir.
    ordersResponse = ordersPage([orderPending], 1, 1);

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=1&size=10");
    });
    // A página 1 não existe mais; volta para a página 0 automaticamente.
    await waitFor(() => {
      expect(orderListCalls()).toContain("/api/orders?page=0&size=10");
    });
    expect(await screen.findByText("Página 1 de 1")).toBeInTheDocument();
  });
});

describe("OrdersPage — status finais", () => {
  it("não oferece ação de avanço ou cancelamento para pedidos entregues/cancelados", async () => {
    installGetRoutes({
      orders: ordersPage([orderDelivered, orderCancelled]),
    });
    render(<OrdersPage />);

    expect(await screen.findByText("PED-0004")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(2);
    expect(screen.queryByRole("button", { name: /Avançar para/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});
