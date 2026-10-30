"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/formatters";
import type { OrderDetails } from "@/lib/types/order";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faRotate,
  faStickyNote,
} from "@fortawesome/free-solid-svg-icons";

function formatDateTimeBR(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrderDetailsModalProps {
  /** Identificador do pedido a ser detalhado. */
  orderId: string;
  /**
   * Muda a identidade do valor para recarregar o detalhe (ex.: após o status
   * ser alterado pela listagem enquanto o modal está aberto).
   */
  reloadKey?: number;
  onClose: () => void;
}

/**
 * Modal de detalhe do pedido — consome `GET /api/orders/{orderId}` no BFF.
 * Exibe identificação, cliente, itens, totais, endereço, observações e, quando
 * presente, o motivo e a data de cancelamento.
 */
export function OrderDetailsModal({ orderId, reloadKey = 0, onClose }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<OrderDetails>(`/api/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      setOrder(null);
      setError(getApiErrorMessage(err, "Erro ao carregar o pedido."));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOrder();
  }, [fetchOrder, reloadKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando pedido">
            <div className="mh-dash-skeleton h-6 w-48" />
            <div className="mh-dash-skeleton h-4 w-64" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="mh-dash-skeleton h-10 w-full rounded-sm" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="font-medium text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void fetchOrder()}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
            >
              <FontAwesomeIcon icon={faRotate} className="h-3 w-3" /> Tentar novamente
            </button>
          </div>
        ) : order ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="order-details-title" className="text-lg font-semibold text-foreground">
                  Pedido {order.orderNumber}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Criado em {formatDateTimeBR(order.createdAt)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            {/* Cliente */}
            <section className="mt-6" aria-labelledby="order-details-customer">
              <h3 id="order-details-customer" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Cliente
              </h3>
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium text-foreground">{order.customer?.name ?? "-"}</p>
                <p className="text-muted-foreground">{order.customer?.email ?? "Sem e-mail"}</p>
                <p className="text-muted-foreground">{order.customer?.phone ?? "Sem telefone"}</p>
                {order.paymentStatus && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pagamento: {order.paymentStatus}
                  </p>
                )}
              </div>
            </section>

            {/* Itens */}
            <section className="mt-6" aria-labelledby="order-details-items">
              <h3 id="order-details-items" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Itens ({order.items.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2 text-center">Qtd.</th>
                      <th className="px-3 py-2 text-right">Unitário</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 font-medium text-foreground">{item.productName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.sku ?? "-"}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatCurrency(Number(item.unitPrice))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(Number(item.totalPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Totais */}
            <section className="mt-6" aria-labelledby="order-details-totals">
              <h3 id="order-details-totals" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Totais
              </h3>
              <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Descontos</span>
                  <span>-{formatCurrency(Number(order.discountTotal))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span>{formatCurrency(Number(order.deliveryFee))}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
            </section>

            {/* Entrega e observações */}
            <section className="mt-6" aria-labelledby="order-details-delivery">
              <h3 id="order-details-delivery" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Entrega e observações
              </h3>
              <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                <p className="flex items-start gap-2 text-foreground">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {order.deliveryAddress ?? "Endereço não informado"}
                </p>
                {order.notes && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <FontAwesomeIcon icon={faStickyNote} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {order.notes}
                  </p>
                )}
              </div>
            </section>

            {/* Cancelamento */}
            {order.status === "CANCELLED" && (
              <section className="mt-6" aria-labelledby="order-details-cancellation">
                <h3 id="order-details-cancellation" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Cancelamento
                </h3>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="text-destructive">
                    Cancelado em{" "}
                    {order.cancelledAt ? formatDateTimeBR(order.cancelledAt) : "-"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Motivo: {order.cancelReason ?? "-"}
                  </p>
                </div>
              </section>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
