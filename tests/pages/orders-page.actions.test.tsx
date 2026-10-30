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
  orderPreparing,
  orderShipped,
  ordersPage,
  statusUpdateResponse,
} from "./orders-fixtures";

const mockedGet = api.get as unknown as Mock;
const mockedPatch = api.patch as unknown as Mock;

function installGetRoutes() {
  mockedGet.mockImplementation(async (input: string) => {
    if (input.startsWith("/api/orders?")) {
      return ordersPage([orderPending, orderPreparing, orderShipped]);
    }
    if (input.startsWith(`/api/orders/${orderPending.id}`)) {
      return orderDetails;
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function orderListCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter((input) => typeof input === "string" && input.startsWith("/api/orders?"));
}

/** Busca um botão dentro da linha do pedido indicado. */
function rowButton(orderNumber: string, name: string | RegExp): HTMLElement {
  const row = screen.getByText(orderNumber).closest("tr") as HTMLElement;
  return within(row).getByRole("button", { name });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchParams = new URLSearchParams();
  mocks.permissions = ["orders:read", "orders:update", "orders:cancel"];
  installGetRoutes();
  mockedPatch.mockResolvedValue(statusUpdateResponse);
});

describe("OrdersPage — avanço de status", () => {
  it("avança PENDING → PREPARING e recarrega a listagem", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Avançar para Preparando" }),
    );

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith(
        `/api/orders/${orderPending.id}/status`,
        { status: "PREPARING" },
      );
    });
    // A listagem é recarregada após o sucesso.
    await waitFor(() => {
      expect(orderListCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("avança PREPARING → SHIPPED e SHIPPED → DELIVERED conforme as transições permitidas", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0002")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Avançar para Enviado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Avançar para Entregue" }),
    ).toBeInTheDocument();
  });

  it("mostra o erro da API e não altera o status visual em caso de falha", async () => {
    mockedPatch.mockRejectedValue(
      apiError(400, {
        error: "INSUFFICIENT_STOCK",
        message: "Estoque insuficiente para preparar o pedido.",
      }),
    );
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Avançar para Preparando" }),
    );

    expect(
      await screen.findByText("Estoque insuficiente para preparar o pedido."),
    ).toBeInTheDocument();
    // O pedido continua visualmente no status anterior: o badge segue
    // "Pendente" e a ação oferecida continua sendo avançar para Preparando.
    const row = screen.getByText("PED-0001").closest("tr") as HTMLElement;
    expect(within(row).getAllByText("Pendente").length).toBeGreaterThan(0);
    expect(
      within(row).getByRole("button", { name: "Avançar para Preparando" }),
    ).toBeInTheDocument();
  });

  it("não oferece botão de avanço sem orders:update", async () => {
    mocks.permissions = ["orders:read", "orders:cancel"];
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Avançar para/ })).not.toBeInTheDocument();
    expect(rowButton("PED-0001", "Cancelar")).toBeInTheDocument();
  });
});

describe("OrdersPage — cancelamento", () => {
  it("cancela com motivo, enviando cancelReason no corpo", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(rowButton("PED-0001", "Cancelar"));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(/Motivo do cancelamento/),
      "Cliente desistiu da compra",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith(
        `/api/orders/${orderPending.id}/status`,
        { status: "CANCELLED", cancelReason: "Cliente desistiu da compra" },
      );
    });
    // O diálogo fecha e a listagem é recarregada após o sucesso.
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(orderListCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("exige motivo antes de enviar o cancelamento", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(rowButton("PED-0001", "Cancelar"));
    await screen.findByRole("alertdialog");

    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    expect(
      await screen.findByText("Informe o motivo do cancelamento."),
    ).toBeInTheDocument();
    expect(mockedPatch).not.toHaveBeenCalled();
  });

  it("exibe a validação do servidor sem fechar o diálogo", async () => {
    mockedPatch.mockRejectedValue(
      apiError(400, {
        error: "CANCEL_REASON_REQUIRED",
        message: "O motivo do cancelamento é obrigatório.",
      }),
    );
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    await userEvent.click(rowButton("PED-0001", "Cancelar"));
    await userEvent.type(
      screen.getByLabelText(/Motivo do cancelamento/),
      "Cliente desistiu",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    expect(
      await screen.findByText("O motivo do cancelamento é obrigatório."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("permite cancelar pedidos PREPARING, mas não SHIPPED", async () => {
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0002")).toBeInTheDocument();

    const preparingRow = screen.getByText("PED-0002").closest("tr") as HTMLElement;
    const shippedRow = screen.getByText("PED-0003").closest("tr") as HTMLElement;
    expect(preparingRow.textContent).toContain("Cancelar");
    expect(shippedRow.textContent).not.toContain("Cancelar");
  });

  it("não oferece cancelamento sem orders:cancel", async () => {
    mocks.permissions = ["orders:read", "orders:update"];
    render(<OrdersPage />);
    expect(await screen.findByText("PED-0001")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Avançar para Preparando" }),
    ).toBeInTheDocument();
  });
});
