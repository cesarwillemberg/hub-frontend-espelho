import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permissions: ["orders:read", "products:read"],
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/orders",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      name: "Ana Souza",
      email: "ana@email.com",
      roles: [{ id: "r1", name: "OWNER" }],
      permissions: mocks.permissions,
    },
    tenant: { id: "t1", marketName: "Mercado Central", slug: "mercado-central", status: "ACTIVE" },
    isAuthenticated: true,
    hasPermission: (permission: string) =>
      mocks.permissions.includes(permission),
    hasRole: () => true,
  }),
}));

import { Sidebar } from "@/components/layout/Sidebar";

beforeEach(() => {
  mocks.permissions = ["orders:read"];
});

describe("Sidebar — permissões de navegação", () => {
  it("exibe o link de Pedidos apontando para /orders quando há orders:read", () => {
    render(<Sidebar collapsed={false} setCollapsed={() => {}} />);

    const pedidosLink = screen.getByRole("link", { name: "Pedidos" });
    expect(pedidosLink).toHaveAttribute("href", "/orders");
    // O link legado /dashboard/orders não existe mais.
    expect(screen.queryByRole("link", { name: "Pedidos" })).not.toHaveAttribute(
      "href",
      "/dashboard/orders",
    );
  });

  it("oculta o link de Pedidos sem orders:read", () => {
    mocks.permissions = [];
    render(<Sidebar collapsed={false} setCollapsed={() => {}} />);

    expect(screen.queryByRole("link", { name: "Pedidos" })).not.toBeInTheDocument();
    // Itens sem permissão exigida continuam visíveis.
    expect(screen.getByRole("link", { name: "Produtos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it.each(["audit:read", "activity_logs:read"])("exibe auditoria com %s", (permission) => {
    mocks.permissions = [permission];
    render(<Sidebar collapsed={false} setCollapsed={() => {}} />);
    expect(screen.getByRole("link", { name: "Auditoria" })).toHaveAttribute("href", "/audit");
  });

  it("oculta auditoria sem permissão de leitura", () => {
    mocks.permissions = [];
    render(<Sidebar collapsed={false} setCollapsed={() => {}} />);
    expect(screen.queryByRole("link", { name: "Auditoria" })).not.toBeInTheDocument();
  });
});
