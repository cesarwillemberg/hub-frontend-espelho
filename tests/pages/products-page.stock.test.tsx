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
  movement1,
  movement2,
  movementsPage,
  product1,
  product2,
  productsPage,
} from "./products-fixtures";

const mockedGet = api.get as unknown as Mock;
const mockedPost = api.post as unknown as Mock;
const mockedPut = api.put as unknown as Mock;
const mockedPatch = api.patch as unknown as Mock;

interface RouteOptions {
  movements?: ReturnType<typeof movementsPage> | "error";
}

function installGetRoutes(options: RouteOptions = {}) {
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
    if (input.includes("/stock-movements")) {
      if (options.movements === "error") {
        throw apiError(500, { error: "INTERNAL", message: "Falha no histórico" });
      }
      return options.movements ?? movementsPage([movement1], 7, 2);
    }
    throw new Error(`GET inesperado: ${input}`);
  });
}

function movementsCalls(): string[] {
  return mockedGet.mock.calls
    .map(([input]: [string]) => input)
    .filter((input) => typeof input === "string" && input.includes("/stock-movements"));
}

async function openStockModal() {
  const cell = await screen.findByText("Arroz Branco 5kg");
  const row = cell.closest("tr") as HTMLElement;
  await userEvent.click(within(row).getByRole("button", { name: /estoque/i }));
  return screen.getByRole("dialog");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  installGetRoutes();
});

describe("ProductsPage — modal de estoque", () => {
  it("abre o modal e carrega o histórico de movimentações", async () => {
    render(<ProductsPage />);

    const dialog = await openStockModal();

    expect(
      within(dialog).getByText("Estoque — Arroz Branco 5kg"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        (_, element) =>
          element?.tagName === "P" &&
          (element.textContent ?? "").includes("Estoque atual: 2"),
      ),
    ).toBeInTheDocument();

    expect(await within(dialog).findByText("Recebimento de mercadoria")).toBeInTheDocument();
    expect(within(dialog).getByText("Entrada")).toBeInTheDocument();
    expect(within(dialog).getByText("Página 1 de 2")).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith(
      `/api/products/${product1.id}/stock-movements?page=0&size=5`,
    );
  });

  it("ajusta o estoque com operação, quantidade e motivo, e recarrega o histórico", async () => {
    render(<ProductsPage />);
    const dialog = await openStockModal();
    await within(dialog).findByText("Recebimento de mercadoria");

    await userEvent.selectOptions(
      within(dialog).getByLabelText("Operação"),
      "INCREMENT",
    );
    await userEvent.type(within(dialog).getByLabelText("Quantidade"), "5");
    await userEvent.type(within(dialog).getByLabelText("Motivo"), "Recebimento de lote novo");

    mockedPatch.mockResolvedValue({ ...product1, stockQuantity: 7 });

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Ajustar estoque" }),
    );

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith(`/api/products/${product1.id}/stock`, {
        operation: "INCREMENT",
        quantity: 5,
        reason: "Recebimento de lote novo",
      });
    });
    await waitFor(() => {
      expect(movementsCalls().length).toBeGreaterThanOrEqual(2);
    });
    // O formulário é limpo após o ajuste bem-sucedido.
    expect(
      (within(dialog).getByLabelText("Quantidade") as HTMLInputElement).value,
    ).toBe("");
    expect(within(dialog).getByLabelText("Motivo")).toHaveValue("");
  });

  it("valida a quantidade antes de enviar o ajuste", async () => {
    render(<ProductsPage />);
    const dialog = await openStockModal();
    await within(dialog).findByText("Recebimento de mercadoria");

    await userEvent.type(within(dialog).getByLabelText("Quantidade"), "-3");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Ajustar estoque" }),
    );

    expect(
      await within(dialog).findByText(
        "Informe uma quantidade inteira, maior ou igual a zero.",
      ),
    ).toBeInTheDocument();
    expect(mockedPatch).not.toHaveBeenCalled();
  });

  it("exibe erro do backend ao ajustar (ex.: estoque insuficiente)", async () => {
    render(<ProductsPage />);
    const dialog = await openStockModal();
    await within(dialog).findByText("Recebimento de mercadoria");

    await userEvent.selectOptions(
      within(dialog).getByLabelText("Operação"),
      "DECREMENT",
    );
    await userEvent.type(within(dialog).getByLabelText("Quantidade"), "999");

    mockedPatch.mockRejectedValue(
      apiError(400, {
        error: "INSUFFICIENT_STOCK",
        message: "A operação deixaria o estoque negativo.",
      }),
    );

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Ajustar estoque" }),
    );

    expect(
      await within(dialog).findByText("A operação deixaria o estoque negativo."),
    ).toBeInTheDocument();
  });

  it("exibe erro quando o histórico não carrega, com tentar novamente", async () => {
    installGetRoutes({ movements: "error" });
    render(<ProductsPage />);
    const dialog = await openStockModal();

    expect(
      await within(dialog).findByText("Falha no histórico"),
    ).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Tentar novamente" }),
    );
    await waitFor(() => {
      expect(movementsCalls().length).toBeGreaterThanOrEqual(2);
    });
  });

  it("pagina o histórico de movimentações", async () => {
    render(<ProductsPage />);
    const dialog = await openStockModal();
    expect(await within(dialog).findByText("Recebimento de mercadoria")).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Próximo" }),
    );

    await waitFor(() => {
      expect(
        movementsCalls().some((input) =>
          input.includes("/stock-movements?page=1&size=5"),
        ),
      ).toBe(true);
    });
    expect(within(dialog).getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("mostra as duas movimentações da segunda página", async () => {
    installGetRoutes({
      movements: movementsPage([movement1, movement2], 7, 2),
    });
    render(<ProductsPage />);
    const dialog = await openStockModal();
    expect(await within(dialog).findByText("Recebimento de mercadoria")).toBeInTheDocument();
    expect(within(dialog).getByText("Saída")).toBeInTheDocument();
    expect(within(dialog).getByText("Venda em loja")).toBeInTheDocument();
  });
});

describe("ProductsPage — upload de imagem", () => {
  async function openEditModal() {
    const cell = await screen.findByText("Arroz Branco 5kg");
    const row = cell.closest("tr") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: /editar/i }));
    return screen.getByRole("dialog");
  }

  it("solicita URL pré-assinada, envia com PUT e confirma com PATCH", async () => {
    const file = new File(["conteudo"], "foto.png", { type: "image/png" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductsPage />);
    const dialog = await openEditModal();

    await userEvent.upload(within(dialog).getByLabelText("Imagem do produto"), file);
    expect(
      within(dialog).getByText("foto.png será enviado após salvar o produto."),
    ).toBeInTheDocument();

    mockedPut.mockResolvedValue({ ...product1 });
    mockedPost.mockResolvedValue({
      uploadUrl: "https://storage.example.com/upload?sig=abc",
      publicUrl: "https://cdn.example.com/produtos/foto.png",
      expiresIn: 300,
    });
    mockedPatch.mockResolvedValue({
      ...product1,
      imageUrl: "https://cdn.example.com/produtos/foto.png",
    });

    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        `/api/products/${product1.id}/image-upload-url`,
        { fileName: "foto.png", contentType: "image/png" },
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("https://storage.example.com/upload?sig=abc", {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: file,
      });
    });
    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith(`/api/products/${product1.id}/image`, {
        imageUrl: "https://cdn.example.com/produtos/foto.png",
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("informa falha no upload sem sucesso parcial e evita produto duplicado", async () => {
    const file = new File(["conteudo"], "foto.png", { type: "image/png" });
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductsPage />);
    const dialog = await openEditModal();

    await userEvent.upload(within(dialog).getByLabelText("Imagem do produto"), file);

    mockedPut.mockResolvedValue({ ...product1 });
    mockedPost.mockResolvedValue({
      uploadUrl: "https://storage.example.com/upload?sig=abc",
      publicUrl: "https://cdn.example.com/produtos/foto.png",
      expiresIn: 300,
    });
    mockedPatch.mockResolvedValue({
      ...product1,
      imageUrl: "https://cdn.example.com/produtos/foto.png",
    });

    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(
      await within(dialog).findByText(
        "Produto salvo, mas o envio da imagem falhou: falha ao enviar o arquivo para o armazenamento (HTTP 500).",
      ),
    ).toBeInTheDocument();
    // Modal continua aberto — sem estado de sucesso parcial.
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Nova tentativa: deve reusar o produto já salvo (PUT), sem duplicar —
    // nenhum POST de criação deve acontecer (o POST de image-upload-url pode
    // ocorrer novamente, pois faz parte do fluxo de upload).
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(mockedPut).toHaveBeenCalledTimes(2);
    });
    const createProductCalls = mockedPost.mock.calls.filter(
      ([input]: [string]) => input === "/api/products",
    );
    expect(createProductCalls).toHaveLength(0);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
