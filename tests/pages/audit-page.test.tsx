import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
import { api } from "@/lib/api/client";
import AuditPage from "@/app/(dashboard)/audit/page";

const mockedGet = api.get as unknown as Mock;
const log = {
  id: "11111111-1111-4111-8111-111111111111", action: "PRODUCT_UPDATED", entity: "PRODUCT",
  entityId: "22222222-2222-4222-8222-222222222222", description: "Estoque atualizado",
  performedBy: { id: "33333333-3333-4333-8333-333333333333", name: "Ana Souza", email: "ana@example.com" },
  metadata: { quantity: 4 }, createdAt: "2026-10-25T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedGet.mockImplementation(async (url: string) => url.includes("/11111111-1111-4111-8111-111111111111")
    ? { ...log, ipAddress: "127.0.0.1", userAgent: "Test Browser" }
    : { content: [log], page: 0, size: 20, totalElements: 1, totalPages: 1 });
});

describe("AuditPage", () => {
  it("lista eventos, aplica filtros e abre detalhes", async () => {
    render(<AuditPage />);
    expect(await screen.findByText("PRODUCT_UPDATED")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Ação, entidade, descrição ou autor"), { target: { value: "estoque" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("search=estoque"))).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(await screen.findByText("127.0.0.1")).toBeInTheDocument();
    expect(screen.getByText("Test Browser")).toBeInTheDocument();
  });

  it("impede intervalo de datas invertido", async () => {
    render(<AuditPage />);
    await screen.findByText("PRODUCT_UPDATED");
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-10-25" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("data inicial deve ser anterior");

  });

  it("mostra estado vazio sem filtros", async () => {
    mockedGet.mockResolvedValueOnce({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    render(<AuditPage />);
    expect(await screen.findByText("Ainda não há registros")).toBeInTheDocument();
  });
});
