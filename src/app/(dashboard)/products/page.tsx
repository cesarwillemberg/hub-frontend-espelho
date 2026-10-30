"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Category, PageResponse, Product } from "@/lib/types/product";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { StockModal } from "@/components/products/StockModal";
import { ConfirmDialog } from "@/components/products/ConfirmDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { formatCurrency } from "@/lib/formatters";
import {
  faBoxOpen,
  faBoxesStacked,
  faEdit,
  faExclamationTriangle,
  faImage,
  faPlus,
  faRotate,
  faSearch,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const CATEGORY_SELECT_SIZE = 200;

interface ProductFilters {
  search: string;
  categoryId: string;
  active: "" | "true" | "false";
  lowStock: "" | "true";
}

const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  categoryId: "",
  active: "",
  lowStock: "",
};

export default function ProductsPage() {
  // Lista de produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Filtros
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);

  // Categorias (usadas no filtro e no formulário)
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Alerta de estoque baixo
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [lowStockError, setLowStockError] = useState<string | null>(null);

  // Chave que força recarga da lista, categorias e alertas após mutações
  const [refreshKey, setRefreshKey] = useState(0);

  // Modais
  const [formModal, setFormModal] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [stockModal, setStockModal] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

  // Busca com debounce: aplica o termo digitado e reinicia a página atual.
  // Observação: não ativa o skeleton aqui — quando o termo muda de fato, o
  // efeito de fetch assume o estado de carregamento. Isso evita que o timer
  // da montagem (termo inalterado) deixe a lista em skeleton permanente.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput },
      );
      setPage((prev) => (prev === 0 ? prev : 0));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const applyFilters = useCallback((patch: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
    setLoading(true);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.active) params.set("active", filters.active);
    if (filters.lowStock) params.set("lowStock", filters.lowStock);
    try {
      const data = await api.get<PageResponse<Product>>(
        `/api/products?${params.toString()}`,
      );
      setProducts(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setProducts([]);
      setTotalElements(0);
      setTotalPages(0);
      setListError(getApiErrorMessage(err, "Erro ao carregar produtos."));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    // Carregamento da lista seguindo o padrão usado no dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProducts();
  }, [fetchProducts, refreshKey]);

  const fetchLowStock = useCallback(async () => {
    setLowStockError(null);
    try {
      const data = await api.get<PageResponse<Product>>(
        "/api/products/low-stock?size=1",
      );
      setLowStockCount(data.totalElements);
    } catch (err) {
      setLowStockCount(null);
      // Falha no alerta não pode ser ignorada silenciosamente.
      setLowStockError(
        getApiErrorMessage(err, "Não foi possível carregar os alertas de estoque baixo."),
      );
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLowStock();
  }, [fetchLowStock, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PageResponse<Category>>(
        `/api/categories?size=${CATEGORY_SELECT_SIZE}&active=true`,
      )
      .then((data) => {
        if (!cancelled) {
          setCategories(data.content ?? []);
          setCategoriesError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCategoriesError(
            getApiErrorMessage(err, "Não foi possível carregar as categorias."),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleSaved = useCallback((saved: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    setRefreshKey((key) => key + 1);
  }, []);

  const handleAdjusted = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setRefreshKey((key) => key + 1);
  }, []);

  async function handleToggleActive(product: Product, active: boolean) {
    if (updatingStatusId) return;

    setUpdatingStatusId(product.id);
    setStatusErrors((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });

    try {
      await api.put<Product>(`/api/products/${product.id}`, {
        name: product.name,
        description: product.description ?? undefined,
        categoryId: product.category?.id ?? undefined,
        sku: product.sku ?? undefined,
        barcode: product.barcode ?? undefined,
        price: Number(product.price),
        promotionalPrice: product.promotionalPrice ?? undefined,
        stockQuantity: product.stockQuantity ?? 0,
        lowStockThreshold: product.lowStockThreshold ?? undefined,
        active,
      });
      if (filters.active && products.length === 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      }
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setStatusErrors((current) => ({
        ...current,
        [product.id]: getApiErrorMessage(error, "Não foi possível atualizar o status do produto."),
      }));
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Erro ao excluir o produto."));
    } finally {
      setDeleting(false);
    }
  }

  const filtersActive =
    filters.search !== "" ||
    filters.categoryId !== "" ||
    filters.active !== "" ||
    filters.lowStock !== "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo e estoque</p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({ open: true, product: null })}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} /> Novo Produto
        </button>
      </div>

      {lowStockError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning"
        >
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 shrink-0" />
            <div>
              <h3 className="font-medium">Alerta de estoque baixo indisponível</h3>
              <p className="text-sm">{lowStockError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchLowStock()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-warning/40 px-3 py-1.5 text-sm transition-colors hover:bg-warning/15"
          >
            <FontAwesomeIcon icon={faRotate} className="h-3 w-3" /> Tentar novamente
          </button>
        </div>
      ) : lowStockCount != null && lowStockCount > 0 ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg bg-destructive p-4 text-primary-foreground"
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 shrink-0" />
          <div>
            <h3 className="font-medium">Estoque baixo</h3>
            <p className="text-sm">
              {lowStockCount} produto(s) precisam de reposição
            </p>
          </div>
        </div>
      ) : null}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-3 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            aria-label="Buscar produtos"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <select
          aria-label="Filtrar por categoria"
          value={filters.categoryId}
          onChange={(event) => applyFilters({ categoryId: event.target.value })}
          className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por status"
          value={filters.active}
          onChange={(event) =>
            applyFilters({ active: event.target.value as ProductFilters["active"] })
          }
          className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        >
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select
          aria-label="Filtrar por estoque baixo"
          value={filters.lowStock}
          onChange={(event) =>
            applyFilters({ lowStock: event.target.value as ProductFilters["lowStock"] })
          }
          className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        >
          <option value="">Todo o estoque</option>
          <option value="true">Somente estoque baixo</option>
        </select>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              applyFilters(DEFAULT_FILTERS);
            }}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </form>

      {categoriesError && (
        <p role="alert" className="text-sm text-warning">
          {categoriesError}
        </p>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height="3rem" radius="0.5rem" />
            ))}
          </div>
        ) : listError ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          >
            <p className="font-medium text-destructive">{listError}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchProducts();
              }}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
            >
              <FontAwesomeIcon icon={faRotate} className="h-3 w-3" /> Tentar novamente
            </button>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={faBoxOpen}
            title="Nenhum produto encontrado"
            description="Ajuste a busca ou os filtros, ou cadastre um novo produto no catálogo."
            action={
              <button
                type="button"
                onClick={() => setFormModal({ open: true, product: null })}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Novo Produto
              </button>
            }
          />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                <th className="pb-3">Produto</th>
                <th className="pb-3">Categoria</th>
                <th className="pb-3">SKU</th>
                <th className="pb-3 text-right">Preço</th>
                <th className="pb-3 text-center">Estoque</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border hover:bg-surface-muted transition-colors"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={product.imageUrl}
                          alt={`Imagem de ${product.name}`}
                          className="h-10 w-10 shrink-0 rounded border border-border object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-surface-muted">
                          <FontAwesomeIcon
                            icon={faImage}
                            className="h-4 w-4 text-muted-foreground"
                          />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium">{product.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {product.description ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {product.category?.name ?? "-"}
                  </td>
                  <td className="py-3 text-muted-foreground">{product.sku ?? "-"}</td>
                  <td className="py-3 text-right font-medium">
                    {formatCurrency(Number(product.price))}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        product.lowStock
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-positive/10 text-positive border border-positive/20"
                      }`}
                    >
                      {product.stockQuantity ?? 0}
                    </span>
                  </td>
                  <td className="py-3">
                    <ToggleSwitch
                      checked={product.active}
                      ariaLabel={`${product.active ? "Desativar" : "Ativar"} ${product.name}`}
                      ariaDescribedBy={statusErrors[product.id] ? `product-status-error-${product.id}` : undefined}
                      disabled={updatingStatusId !== null}
                      onCheckedChange={(active) => void handleToggleActive(product, active)}
                    />
                    {statusErrors[product.id] && (
                      <p
                        id={`product-status-error-${product.id}`}
                        role="alert"
                        className="mt-1 max-w-36 text-xs text-destructive"
                      >
                        {statusErrors[product.id]}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setStockModal({ open: true, product })}
                      aria-label={`Ajustar estoque de ${product.name}`}
                      title="Estoque"
                      className="mr-3 text-xs text-primary hover:underline"
                    >
                      <FontAwesomeIcon icon={faBoxesStacked} className="mr-1 h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormModal({ open: true, product })}
                      aria-label={`Editar ${product.name}`}
                      title="Editar"
                      className="mr-3 text-xs text-primary hover:underline"
                    >
                      <FontAwesomeIcon icon={faEdit} className="mr-1 h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(product);
                      }}
                      aria-label={`Excluir ${product.name}`}
                      title="Excluir"
                      className="text-xs text-destructive hover:underline"
                    >
                      <FontAwesomeIcon icon={faTrash} className="mr-1 h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !listError && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Exibindo {products.length} de {totalElements} produtos
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Página {totalPages > 0 ? page + 1 : 0} de {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.max(0, current - 1));
              }}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-surface-muted"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => current + 1);
              }}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-surface-muted"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {formModal.open && (
        <ProductFormModal
          key={formModal.product?.id ?? "new"}
          product={formModal.product}
          categories={categories}
          onClose={() => setFormModal({ open: false, product: null })}
          onSaved={handleSaved}
        />
      )}

      {stockModal.open && stockModal.product && (
        <StockModal
          key={stockModal.product.id}
          product={stockModal.product}
          onClose={() => setStockModal({ open: false, product: null })}
          onAdjusted={handleAdjusted}
        />
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Excluir produto"
        message={
          deleteTarget ? (
            <>
              Tem certeza que deseja excluir{" "}
              <strong>{deleteTarget.name}</strong>? O produto será desativado
              (exclusão lógica) e deixará de aparecer no catálogo.
            </>
          ) : null
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        loading={deleting}
        error={deleteError}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
