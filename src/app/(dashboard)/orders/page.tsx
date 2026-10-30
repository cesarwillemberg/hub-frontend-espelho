"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canCancelStatus,
  nextAdvanceStatus,
  type OrderPageResponse,
  type OrderStatus,
  type OrderSummary,
} from "@/lib/types/order";
import { CancelOrderDialog } from "@/components/orders/CancelOrderDialog";
import { OrderDetailsModal } from "@/components/orders/OrderDetailsModal";
import { ORDER_STATUS_LABELS, OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import {
  faBan,
  faCartShopping,
  faEye,
  faLock,
  faRotate,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

interface OrderFilters {
  search: string;
  status: OrderStatus | "";
  dateFrom: string;
  dateTo: string;
}

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const inputClass =
  "px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all";

/**
 * Página de pedidos — rota `/orders` (o grupo `(dashboard)` não entra na URL).
 *
 * Consome o BFF Hub:
 * - `GET /api/orders` (listagem paginada com busca, status e período);
 * - `GET /api/orders/{orderId}` (detalhe);
 * - `PATCH /api/orders/{orderId}/status` (avanço de status e cancelamento com
 *   motivo em `cancelReason`, convertido para `cancel_reason` pelo BFF).
 */
function OrdersPageContent() {
  const { hasPermission } = useAuth();
  // Controle de UX apenas: a autorização real é aplicada pelo Core API.
  const canRead = hasPermission("orders:read");
  const canUpdate = hasPermission("orders:update");
  const canCancel = hasPermission("orders:cancel");

  const searchParams = useSearchParams();
  const statusFromUrl = (searchParams.get("status") ?? "") as OrderStatus | "";

  // Lista de pedidos
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Filtros (busca com debounce, seguindo o padrão da tela de produtos)
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<OrderFilters>(() => ({
    search: "",
    status: statusFromUrl,
    dateFrom: "",
    dateTo: "",
  }));

  // Chave que força recarga da listagem após mutações
  const [refreshKey, setRefreshKey] = useState(0);

  // Detalhe do pedido
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);

  // Ações de status
  const [cancelTarget, setCancelTarget] = useState<OrderSummary | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sincroniza o filtro de status com a querystring (deep links do dashboard,
  // ex.: /orders?status=PENDING). Usa o padrão de ajuste de estado durante a
  // render recomendado pelo React, sem efeitos em cascata.
  const [prevUrlStatus, setPrevUrlStatus] = useState(statusFromUrl);
  if (statusFromUrl !== prevUrlStatus) {
    setPrevUrlStatus(statusFromUrl);
    setFilters((prev) =>
      prev.status === statusFromUrl ? prev : { ...prev, status: statusFromUrl },
    );
    setPage(0);
  }

  // Busca com debounce: aplica o termo digitado e reinicia a página atual.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput },
      );
      setPage((prev) => (prev === 0 ? prev : 0));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const applyFilters = useCallback((patch: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage((prev) => (prev === 0 ? prev : 0));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.status) params.set("status", filters.status);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    try {
      const data = await api.get<OrderPageResponse>(
        `/api/orders?${params.toString()}`,
      );
      // A página atual pode ter deixado de existir (ex.: item cancelado ou
      // filtrado): recarrega a última página válida em vez de exibir vazio.
      const lastPage = Math.max(0, data.totalPages - 1);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setOrders(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setOrders([]);
      setTotalElements(0);
      setTotalPages(0);
      setListError(getApiErrorMessage(err, "Erro ao carregar pedidos."));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (!canRead) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOrders();
  }, [fetchOrders, refreshKey, canRead]);

  async function handleAdvance(order: OrderSummary) {
    const next = nextAdvanceStatus(order.status);
    if (!next) return;
    setActionError(null);
    setUpdatingId(order.id);
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status: next });
      setRefreshKey((key) => key + 1);
      setDetailsReloadKey((key) => key + 1);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Erro ao atualizar o status do pedido."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancel(reason: string) {
    if (!cancelTarget) return;
    await api.patch(`/api/orders/${cancelTarget.id}/status`, {
      status: "CANCELLED",
      cancelReason: reason,
    });
    setCancelTarget(null);
    setRefreshKey((key) => key + 1);
    setDetailsReloadKey((key) => key + 1);
  }

  const filtersActive =
    filters.search !== "" ||
    filters.status !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  function clearFilters() {
    setSearchInput("");
    setFilters({ search: "", status: "", dateFrom: "", dateTo: "" });
    setPage(0);
  }

  // Sem permissão de leitura: estado de acesso negado (o link também é
  // ocultado na sidebar). O Core API continua rejeitando chamadas diretas.
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie os pedidos do seu mercado
          </p>
        </div>
        <EmptyState
          icon={faLock}
          title="Acesso negado"
          description="Você não tem permissão (orders:read) para visualizar pedidos. Entre em contato com o administrador do mercado se precisar de acesso."
          className="mh-dash-card"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie os pedidos do seu mercado
          </p>
        </div>
      </div>

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
            placeholder="Buscar por número ou cliente..."
            aria-label="Buscar pedidos"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <select
          aria-label="Filtrar por status"
          value={filters.status}
          onChange={(event) =>
            applyFilters({ status: event.target.value as OrderFilters["status"] })
          }
          className={inputClass}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Filtrar pedidos a partir de"
          value={filters.dateFrom}
          onChange={(event) => applyFilters({ dateFrom: event.target.value })}
          className={inputClass}
        />
        <input
          type="date"
          aria-label="Filtrar pedidos até"
          value={filters.dateTo}
          onChange={(event) => applyFilters({ dateTo: event.target.value })}
          className={inputClass}
        />
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </form>

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p>{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Fechar alerta"
            className="shrink-0 font-bold hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Carregando pedidos">
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
                void fetchOrders();
              }}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
            >
              <FontAwesomeIcon icon={faRotate} className="h-3 w-3" /> Tentar novamente
            </button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={faCartShopping}
            title="Nenhum pedido encontrado"
            description="Ajuste a busca ou os filtros, ou aguarde novos pedidos dos clientes."
          />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                <th className="pb-3">Pedido</th>
                <th className="pb-3">Cliente</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right">Itens</th>
                <th className="pb-3 text-right">Total</th>
                <th className="pb-3">Data</th>
                <th className="pb-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const next = nextAdvanceStatus(order.status);
                const canAdvance = canUpdate && next != null;
                const canCancelThis = canCancel && canCancelStatus(order.status);
                const rowUpdating = updatingId === order.id;
                return (
                  <tr
                    key={order.id}
                    className="border-b border-border hover:bg-surface-muted transition-colors"
                  >
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => setDetailsOrderId(order.id)}
                        className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                        aria-label={`Abrir detalhes do pedido ${order.orderNumber}`}
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.customerEmail ?? order.customerPhone ?? "-"}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 text-right font-medium">{order.itemsCount}</td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(Number(order.total))}
                    </td>
                    <td className="py-3 text-muted-foreground text-sm">
                      {formatDateBR(order.createdAt)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDetailsOrderId(order.id)}
                        className="mr-3 text-xs text-primary hover:underline"
                        aria-label={`Detalhes do pedido ${order.orderNumber}`}
                      >
                        <FontAwesomeIcon icon={faEye} className="mr-1 h-3 w-3" /> Detalhes
                      </button>
                      {canAdvance && next && (
                        <button
                          type="button"
                          onClick={() => void handleAdvance(order)}
                          disabled={rowUpdating}
                          className="mr-3 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          Avançar para {ORDER_STATUS_LABELS[next]}
                        </button>
                      )}
                      {canCancelThis && (
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setCancelTarget(order);
                          }}
                          disabled={rowUpdating}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faBan} className="mr-1 h-3 w-3" /> Cancelar
                        </button>
                      )}
                      {!canAdvance && !canCancelThis && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !listError && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Exibindo {orders.length} de {totalElements} pedidos
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

      {detailsOrderId && (
        <OrderDetailsModal
          orderId={detailsOrderId}
          reloadKey={detailsReloadKey}
          onClose={() => setDetailsOrderId(null)}
        />
      )}

      {cancelTarget && (
        <CancelOrderDialog
          order={cancelTarget}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}

function OrdersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton height="1.5rem" width="10rem" />
          <Skeleton height="0.875rem" width="18rem" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height="3rem" radius="0.5rem" />
        ))}
      </div>
    </div>
  );
}

/**
 * A página lê a querystring via `useSearchParams` (deep links com
 * `?status=...` vindos do dashboard), por isso o conteúdo é envolvido em
 * `Suspense` — requisito do Next.js 16 para permitir o prerender estático.
 */
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageSkeleton />}>
      <OrdersPageContent />
    </Suspense>
  );
}
