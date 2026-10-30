import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permissions: ["users:read", "users:manage"] }));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ hasPermission: (permission: string) => mocks.permissions.includes(permission) }) }));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import { api } from "@/lib/api/client";
import UsersPage from "@/app/(dashboard)/users/page";

const user = { id: "u-1", name: "Ana Silva", email: "ana@example.com", active: true, roles: [{ id: "r-1", name: "Operador" }], createdAt: "2026-01-01T00:00:00Z" };
const userDetail = { ...user, permissions: [], updatedAt: user.createdAt, deletedAt: null };
const mockedGet = api.get as unknown as Mock;
const mockedPost = api.post as unknown as Mock;
const mockedPatch = api.patch as unknown as Mock;
const mockedDelete = api.delete as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ["users:read", "users:manage"];
  mockedGet.mockImplementation(async (url: string) => {
    if (url === "/api/roles") return { roles: [{ id: "r-1", name: "Operador" }, { id: "r-2", name: "Gerente" }] };
    if (url === `/api/users/${user.id}`) return userDetail;
    return { content: [user], page: 0, size: 10, totalElements: 1, totalPages: 1 };
  });
  mockedPost.mockResolvedValue(user); mockedPatch.mockResolvedValue(userDetail); mockedDelete.mockResolvedValue(null);
});

describe("UsersPage", () => {
  it("lista usuários e esconde ações para quem só pode ler", async () => {
    const first = render(<UsersPage />);
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    first.unmount();
    mocks.permissions = ["users:read"];
    render(<UsersPage />);
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Novo usuário" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar Ana Silva" })).not.toBeInTheDocument();
  });

  it("valida e cria usuário com os IDs das roles selecionadas", async () => {
    const ui = userEvent.setup(); render(<UsersPage />);
    await ui.click(await screen.findByRole("button", { name: "Novo usuário" }));
    await ui.click(await screen.findByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("A senha deve ter pelo menos 8 caracteres.")).toBeInTheDocument();
    await ui.type(screen.getByLabelText("Nome"), "Bruno Lima");
    await ui.type(screen.getByLabelText("E-mail"), "bruno@example.com");
    await ui.type(screen.getByLabelText("Senha"), "senha1234");
    await ui.click(screen.getByLabelText("Gerente"));
    await ui.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith("/api/users", { name: "Bruno Lima", email: "bruno@example.com", password: "senha1234", roleIds: ["r-2"] }));
  });

  it("confirma a remoção e atualiza a lista", async () => {
    const ui = userEvent.setup(); render(<UsersPage />);
    await ui.click(await screen.findByRole("button", { name: "Remover Ana Silva" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    await ui.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(`/api/users/${user.id}`));
    expect(mockedPatch).not.toHaveBeenCalled();
  });
});
