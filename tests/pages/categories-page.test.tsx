import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permissions: ["products:read", "products:create", "products:update", "products:delete"] }));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ hasPermission: (permission: string) => mocks.permissions.includes(permission) }) }));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { api } from "@/lib/api/client";
import CategoriesPage from "@/app/(dashboard)/categories/page";

const category = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Mercearia",
  description: "Itens básicos",
  active: true,
  canonicalCategory: { id: "22222222-2222-2222-2222-222222222222", key: "grocery", name: "Mercearia seca", active: true },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
};
const mockedGet = api.get as unknown as Mock;
const mockedPost = api.post as unknown as Mock;
const mockedPut = api.put as unknown as Mock;
const mockedDelete = api.delete as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ["products:read", "products:create", "products:update", "products:delete"];
  mockedGet.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/categories?")) return { content: [category], page: 0, size: 10, totalElements: 1, totalPages: 1 };
    if (url === "/api/catalog-categories") return [
      { id: "22222222-2222-2222-2222-222222222222", key: "grocery", name: "Mercearia seca", active: true },
      { id: "33333333-3333-3333-3333-333333333333", key: "bakery", name: "Padaria", active: false },
    ];
    throw new Error(`GET inesperado: ${url}`);
  });
  mockedPost.mockResolvedValue(category);
  mockedPut.mockResolvedValue(category);
});

describe("CategoriesPage", () => {
  it("carrega categorias e exibe associação canônica e situação", async () => {
    render(<CategoriesPage />);
    expect(await screen.findByText("Mercearia seca")).toBeInTheDocument();
    const row = screen.getByText("Mercearia seca").closest("tr") as HTMLElement;
    expect(within(row).getByRole("switch", { name: "Desativar Mercearia" })).toHaveAttribute("aria-checked", "true");
    expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining("/api/categories?page=0&size=10"));
  });

  it("cria categoria e envia os campos completos incluindo active", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />);
    await user.click(await screen.findByRole("button", { name: "Nova categoria" }));
    expect(screen.getByRole("option", { name: "Padaria (inativa)" })).toBeDisabled();
    await user.type(screen.getByLabelText("Nome *"), "Padaria");
    await user.selectOptions(screen.getByLabelText("Categoria canônica (opcional)"), "grocery");
    await user.click(screen.getByRole("button", { name: "Criar categoria" }));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith("/api/categories", {
      name: "Padaria", description: null, canonicalKey: "grocery", active: true,
    }));
  });

  it("edita e envia o objeto completo esperado pelo PUT", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />);
    await user.click(await screen.findByRole("button", { name: "Editar Mercearia" }));
    const name = screen.getByLabelText("Nome *");
    await user.clear(name);
    await user.type(name, "Mercearia e secos");
    await user.click(screen.getByLabelText("Categoria ativa"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(mockedPut).toHaveBeenCalledWith(`/api/categories/${category.id}`, {
      name: "Mercearia e secos", description: "Itens básicos", canonicalKey: "grocery", active: false,
    }));
  });

  it("altera a situação pelo interruptor usando PUT completo e exibe falhas", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />);
    const statusSwitch = await screen.findByRole("switch", { name: "Desativar Mercearia" });
    await user.click(statusSwitch);
    await waitFor(() => expect(mockedPut).toHaveBeenCalledWith(`/api/categories/${category.id}`, {
      name: "Mercearia", description: "Itens básicos", canonicalKey: "grocery", active: false,
    }));

    mockedPut.mockRejectedValueOnce(Object.assign(new Error("Sem permissão para atualizar"), { status: 403, data: { message: "Sem permissão para atualizar" } }));
    await user.click(await screen.findByRole("switch", { name: "Desativar Mercearia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão para atualizar");
  });

  it("solicita confirmação antes de desativar", async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue(category);
    render(<CategoriesPage />);
    await user.click(await screen.findByRole("button", { name: "Desativar Mercearia" }));
    expect(screen.getByText(/não pode ser revertida pela tela/i)).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Desativar categoria" }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(`/api/categories/${category.id}`));
  });

  it("oculta acesso sem products:read e esconde ações sem permissões de escrita", async () => {
    mocks.permissions = [];
    render(<CategoriesPage />);
    expect(await screen.findByText(/não tem permissão para visualizar categorias/i)).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
    mocks.permissions = ["products:read"];
    render(<CategoriesPage />);
    expect(await screen.findByText("Mercearia seca")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nova categoria" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar Mercearia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar Mercearia" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Desativar Mercearia" })).toBeDisabled();
  });

  it("permite filtrar por inativas e trata falha com opção de nova tentativa", async () => {
    const user = userEvent.setup();
    mockedGet.mockImplementationOnce(async () => { throw Object.assign(new Error("Falha de listagem"), { status: 500, data: { message: "Falha de listagem" } }); });
    render(<CategoriesPage />);
    expect(await screen.findByText("Falha de listagem")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("/api/categories?"))).toBe(true));
    fireEvent.change(screen.getByLabelText("Filtrar situação"), { target: { value: "false" } });
    await waitFor(() => expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("active=false"))).toBe(true));
  });

  it("envia busca e navega usando os metadados de paginação", async () => {
    const user = userEvent.setup();
    mockedGet.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/categories?")) return { content: [category], page: Number(new URLSearchParams(url.split("?")[1]).get("page")), size: 10, totalElements: 21, totalPages: 3 };
      if (url === "/api/catalog-categories") return [];
      throw new Error(`GET inesperado: ${url}`);
    });
    render(<CategoriesPage />);
    expect(await screen.findByText("Mercearia seca")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("page=1"))).toBe(true));
    await user.type(screen.getByRole("searchbox", { name: "Buscar categorias por nome" }), "padaria");
    await waitFor(() => expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("search=padaria"))).toBe(true), { timeout: 2500 });
    expect(mockedGet.mock.calls.some(([url]) => typeof url === "string" && url.includes("page=0"))).toBe(true);
  });
});
