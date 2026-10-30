import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permissions: ["coupons:read", "coupons:manage"] }));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ hasPermission: (permission: string) => mocks.permissions.includes(permission) }) }));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import { api } from "@/lib/api/client";
import TicketsPage from "@/app/(dashboard)/tickets/page";

const coupon = { id: "11111111-1111-4111-8111-111111111111", code: "BOASVINDAS10", name: "Boas-vindas", type: "PERCENTAGE" as const, discountValue: 10, minimumOrderValue: null, usageLimit: 20, usageCount: 4, active: true, startsAt: null, endsAt: null, createdAt: "2026-01-01T00:00:00Z" };
const detail = { ...coupon, description: "Primeira compra", perCustomerLimit: 1, updatedAt: "2026-01-01T00:00:00Z" };
const mockedGet = api.get as unknown as Mock;
const mockedPost = api.post as unknown as Mock;
const mockedPut = api.put as unknown as Mock;
const mockedPatch = api.patch as unknown as Mock;
const mockedDelete = api.delete as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ["coupons:read", "coupons:manage"];
  mockedGet.mockImplementation(async (url: string) => url.startsWith("/api/coupons?") ? { content: [coupon], page: 0, size: 10, totalElements: 1, totalPages: 1 } : detail);
  mockedPost.mockResolvedValue(detail); mockedPut.mockResolvedValue(detail); mockedPatch.mockResolvedValue(detail); mockedDelete.mockResolvedValue(null);
});

describe("TicketsPage", () => {
  it("lista cupons, mostra usos e aplica filtros", async () => {
    const user = userEvent.setup();
    render(<TicketsPage />);
    expect(await screen.findByText("BOASVINDAS10")).toBeInTheDocument();
    expect(screen.getByText("4 / 20")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar cupons por tipo" }), { target: { value: "FREE_SHIPPING" } });
    await waitFor(() => expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("type=FREE_SHIPPING"))).toBe(true));
    await user.click(screen.getByRole("button", { name: "Editar BOASVINDAS10" }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith(`/api/coupons/${coupon.id}`));
  });

  it("cria cupom de frete grátis e omite o campo de valor do desconto", async () => {
    const user = userEvent.setup();
    render(<TicketsPage />);
    await user.click(await screen.findByRole("button", { name: "Novo cupom" }));
    await user.type(screen.getByLabelText("Código"), "FRETEGRATIS");
    await user.type(screen.getByLabelText("Nome"), "Frete grátis");
    await user.selectOptions(screen.getByLabelText("Tipo de benefício"), "FREE_SHIPPING");
    await user.click(screen.getByRole("button", { name: "Salvar cupom" }));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith("/api/coupons", expect.objectContaining({ code: "FRETEGRATIS", type: "FREE_SHIPPING", discountValue: null, minimumOrderValue: null, usageLimit: null, perCustomerLimit: null })));
  });

  it("altera status, confirma exclusão e respeita permissões", async () => {
    const user = userEvent.setup();
    render(<TicketsPage />);
    await user.click(await screen.findByRole("switch", { name: "Desativar BOASVINDAS10" }));
    await waitFor(() => expect(mockedPatch).toHaveBeenCalledWith(`/api/coupons/${coupon.id}/status`, { active: false }));
    await user.click(screen.getByRole("button", { name: "Excluir BOASVINDAS10" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Excluir cupom?");
    expect(mockedDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Excluir cupom" }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(`/api/coupons/${coupon.id}`));
    cleanup();
    mocks.permissions = ["coupons:read"];
    render(<TicketsPage />);
    expect(await screen.findByText("BOASVINDAS10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Novo cupom" })).not.toBeInTheDocument();
    cleanup();
    mocks.permissions = [];
    render(<TicketsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("não tem permissão para consultar cupons");
  });
});
