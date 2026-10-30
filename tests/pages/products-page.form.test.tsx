import { render, screen, waitFor, within } from "@testing-library/react";
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
  product1,
  product2,
  productsPage,
} from "./products-fixtures";

const mockedGet = api.get as unknown as Mock;
const mockedPost = api.post as unknown as Mock;
const mockedPut = api.put as unknown as Mock;
const mockedDelete = api.delete as unknown as Mock;

function installGetRoutes() {
  mockedGet.mockImplementation(async (input: string) => {
    if (input.startsWith("/api/products/low-stock")) {
      return { content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 };
    }
    if (input.startsWith("/api/products?")) {
      return productsPage([product1, product2]);
    }
    if (input.startsWith("/api/categories")) {
      return categoriesPage([category1]);
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function productListCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter((input) => typeof input === "string" && input.startsWith("/api/products?"));
}

async function openCreateModal() {
  await userEvent.click(screen.getByRole("button", { name: "Novo Produto" }));
  return screen.getByRole("dialog");
}

async function rowOf(name: string) {
  const cell = await screen.findByText(name);
  return cell.closest("tr") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  installGetRoutes();
});

describe("ProductsPage — formulário de produto", () => {
  it("cria produto com os campos obrigatórios e atualiza a lista", async () => {
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    const dialog = await openCreateModal();
    expect(within(dialog).getByText("Novo produto")).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText("Nome"), "Café Torrado 500g");
    await userEvent.type(within(dialog).getByLabelText("Preço (R$)"), "15.90");
    await userEvent.type(within(dialog).getByLabelText("Estoque"), "10");
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Categoria"),
      category1.id,
    );

    mockedPost.mockResolvedValue({
      ...product1,
      id: "99999999-9999-9999-9999-999999999999",
      name: "Café Torrado 500g",
    });

    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        "/api/products",
        expect.objectContaining({
          name: "Café Torrado 500g",
          price: 15.9,
          stockQuantity: 10,
          categoryId: category1.id,
          active: true,
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(productListCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("bloqueia envio sem campos obrigatórios com mensagens visíveis", async () => {
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    const dialog = await openCreateModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(
      await within(dialog).findByText("Informe o nome do produto."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Informe o preço.")).toBeInTheDocument();
    expect(within(dialog).getByText("Informe a quantidade em estoque.")).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("exibe erros de validação do backend no formulário", async () => {
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    const dialog = await openCreateModal();
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Café Torrado 500g");
    await userEvent.type(within(dialog).getByLabelText("Preço (R$)"), "15.90");
    await userEvent.type(within(dialog).getByLabelText("Estoque"), "10");

    mockedPost.mockRejectedValue(
      apiError(400, {
        error: "VALIDATION_ERROR",
        message: { sku: ["SKU já cadastrado"] },
      }),
    );

    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(await within(dialog).findByText("sku: SKU já cadastrado")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("exibe erro de permissão ao criar sem autorização", async () => {
    render(<ProductsPage />);
    expect(await screen.findByText("Arroz Branco 5kg")).toBeInTheDocument();

    const dialog = await openCreateModal();
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Café Torrado 500g");
    await userEvent.type(within(dialog).getByLabelText("Preço (R$)"), "15.90");
    await userEvent.type(within(dialog).getByLabelText("Estoque"), "10");

    mockedPost.mockRejectedValue(
      apiError(403, { error: "FORBIDDEN", message: "Sem permissão para criar produtos." }),
    );

    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(
      await within(dialog).findByText("Sem permissão para criar produtos."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("edita um produto existente com o formulário pré-preenchido", async () => {
    render(<ProductsPage />);
    const row = await rowOf("Arroz Branco 5kg");

    await userEvent.click(within(row).getByRole("button", { name: /editar/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Editar produto")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("Arroz Branco 5kg");
    // inputs type=number: jest-dom compara valores numéricos
    expect(within(dialog).getByLabelText("Preço (R$)")).toHaveValue(24.9);
    expect(within(dialog).getByLabelText("Estoque")).toHaveValue(2);
    expect(
      within(dialog).getByLabelText("Limite de estoque baixo"),
    ).toHaveValue(5);
    expect(within(dialog).getByLabelText("Categoria")).toHaveValue(category1.id);

    const nameInput = within(dialog).getByLabelText("Nome");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Arroz Integral 5kg");

    mockedPut.mockResolvedValue({ ...product1, name: "Arroz Integral 5kg" });

    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(mockedPut).toHaveBeenCalledWith(
        `/api/products/${product1.id}`,
        expect.objectContaining({
          name: "Arroz Integral 5kg",
          price: 24.9,
          stockQuantity: 2,
          categoryId: category1.id,
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

describe("ProductsPage — exclusão", () => {
  it("exclui (desativa) o produto após confirmação", async () => {
    render(<ProductsPage />);
    const row = await rowOf("Arroz Branco 5kg");

    await userEvent.click(within(row).getByRole("button", { name: /excluir/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    expect(within(confirmDialog).getByText("Excluir produto")).toBeInTheDocument();
    expect(within(confirmDialog).getByText("Arroz Branco 5kg")).toBeInTheDocument();
    expect(within(confirmDialog).getByText(/exclusão lógica/)).toBeInTheDocument();

    mockedDelete.mockResolvedValue({
      ...product1,
      active: false,
      deletedAt: "2026-10-25T00:00:00Z",
    });

    await userEvent.click(
      within(confirmDialog).getByRole("button", { name: "Excluir" }),
    );

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith(`/api/products/${product1.id}`);
    });
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(productListCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("exibe erro de permissão e mantém o diálogo aberto", async () => {
    render(<ProductsPage />);
    const row = await rowOf("Arroz Branco 5kg");

    await userEvent.click(within(row).getByRole("button", { name: /excluir/i }));

    const confirmDialog = screen.getByRole("alertdialog");
    mockedDelete.mockRejectedValue(
      apiError(403, { error: "FORBIDDEN", message: "Sem permissão de exclusão." }),
    );

    await userEvent.click(
      within(confirmDialog).getByRole("button", { name: "Excluir" }),
    );

    expect(
      await within(confirmDialog).findByText("Sem permissão de exclusão."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
