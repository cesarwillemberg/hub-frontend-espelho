import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import ProductsPage from "@/app/(dashboard)/products/page";
import {
  apiError,
  categoriesPage,
  category1,
  category2,
  product1,
  product2,
  productsPage,
} from "./products-fixtures";

const mockedGet = api.get as unknown as Mock;

interface RouteOptions {
  products?: ReturnType<typeof productsPage> | "error";
  lowStock?: { totalElements: number } | "error";
  categories?: ReturnType<typeof categoriesPage> | "error";
}

function installGetRoutes(options: RouteOptions = {}) {
  mockedGet.mockImplementation(async (input: string) => {
    if (input.startsWith("/api/products/low-stock")) {
      if (options.lowStock === "error") {
        throw apiError(403, { error: "FORBIDDEN", message: "Sem permissão de leitura de estoque." });
      }
      const totalElements =
        typeof options.lowStock === "object" ? options.lowStock.totalElements : 0;
      return { content: [], page: 0, size: 1, totalElements, totalPages: 0 };
    }
    if (input.startsWith("/api/products?")) {
      if (options.products === "error") {
        throw apiError(500, { error: "INTERNAL", message: "Falha ao carregar produtos" });
      }
      return options.products ?? productsPage([]);
    }
    if (input.startsWith("/api/categories")) {
      if (options.categories === "error") {
        throw apiError(500, { error: "INTERNAL", message: "Falha ao carregar categorias" });
      }
      return options.categories ?? categoriesPage([category1, category2]);
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function productListCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter((input) => typeof input === "string" && input.startsWith("/api/products?"));
}

beforeEach(() => {
  vi.clearAllMocks();
  installGetRoutes({ products: productsPage([product1, product2]) });
});

describe("ProductsPage — listagem", () => {
  it("renderiza produtos com categoria, preço, estoque e status", async () => {
    render(<ProductsPage />);

    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();
    expect(screen.getByText("Refrigerante Cola 2L")).toBeInTheDocument();
    // "Mercearia"/"Bebidas" aparecem tanto na coluna Categoria quanto nas
    // opções do filtro de categoria.
    expect(screen.getAllByText("Mercearia").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bebidas").length).toBeGreaterThan(0);
    expect(screen.getByText("ARR-5KG")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
    // Intl pt-BR usa espaço inseparável entre "R$" e o valor; o normalizer do
    // testing-library converte esse espaço para um espaço comum, então a
    // asserção usa espaço normal.
    expect(screen.getByText("R$ 24,90")).toBeInTheDocument();
    expect(screen.getByText("R$ 9,99")).toBeInTheDocument();
    expect(screen.getByText("Exibindo 2 de 2 produtos")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum produto encontrado")).not.toBeInTheDocument();
  });

  it("exibe estado vazio quando não há produtos", async () => {
    installGetRoutes({ products: productsPage([]) });
    render(<ProductsPage />);

    expect(await screen.findByText("Nenhum produto encontrado")).toBeInTheDocument();
    expect(screen.getByText("Exibindo 0 de 0 produtos")).toBeInTheDocument();
  });

  it("exibe alerta de estoque baixo quando existem produtos abaixo do limite", async () => {
    installGetRoutes({ lowStock: { totalElements: 3 } });
    render(<ProductsPage />);

    expect(
      await screen.findByText("3 produto(s) precisam de reposição"),
    ).toBeInTheDocument();
  });

  it("não ignora silenciosamente falha ao carregar o alerta de estoque baixo", async () => {
    installGetRoutes({ lowStock: "error" });
    render(<ProductsPage />);

    expect(
      await screen.findByText("Alerta de estoque baixo indisponível"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sem permissão de leitura de estoque."),
    ).toBeInTheDocument();
  });

  it("exibe erro da listagem com botão de tentar novamente", async () => {
    installGetRoutes({ products: "error" });
    render(<ProductsPage />);

    expect(await screen.findByText("Falha ao carregar produtos")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => {
      expect(productListCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("exibe aviso quando as categorias não carregam", async () => {
    installGetRoutes({ categories: "error" });
    render(<ProductsPage />);

    expect(await screen.findByText("Falha ao carregar categorias")).toBeInTheDocument();
  });
});

describe("ProductsPage — busca e filtros", () => {
  it("aplica a busca com debounce e reinicia a página", async () => {
    installGetRoutes({ products: productsPage([product1], 25, 3) });
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => {
      expect(productListCalls()).toContain("/api/products?page=1&size=10");
    });

    await userEvent.type(screen.getByLabelText("Buscar produtos"), "arroz");
    await waitFor(
      () => {
        expect(productListCalls()).toContain("/api/products?page=0&size=10&search=arroz");
      },
      { timeout: 3000 },
    );
  });

  it("filtra por categoria", async () => {
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por categoria"),
      category1.id,
    );
    await waitFor(() => {
      expect(productListCalls()).toContain(
        `/api/products?page=0&size=10&categoryId=${category1.id}`,
      );
    });
  });

  it("filtra por status e por estoque baixo, com opção de limpar filtros", async () => {
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por status"), "true");
    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por estoque baixo"),
      "true",
    );

    await waitFor(() => {
      expect(productListCalls()).toContain(
        "/api/products?page=0&size=10&active=true&lowStock=true",
      );
    });

    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() => {
      expect(productListCalls()).toContain("/api/products?page=0&size=10");
    });
  });
});

describe("ProductsPage — paginação", () => {
  it("navega entre páginas de produtos", async () => {
    installGetRoutes({ products: productsPage([product1], 25, 3) });
    render(<ProductsPage />);

    expect(await screen.findByText("Exibindo 1 de 25 produtos")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => {
      expect(productListCalls()).toContain("/api/products?page=1&size=10");
    });
    // Durante o refetch o rodapé é substituído pelo skeleton; espera a volta.
    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    await waitFor(() => {
      expect(productListCalls()).toContain("/api/products?page=0&size=10");
    });
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("reinicia a página atual ao mudar um filtro", async () => {
    installGetRoutes({ products: productsPage([product1], 25, 3) });
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => {
      expect(productListCalls()).toContain("/api/products?page=1&size=10");
    });

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por status"), "false");
    await waitFor(() => {
      expect(productListCalls()).toContain(
        "/api/products?page=0&size=10&active=false",
      );
    });
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
  });
});
