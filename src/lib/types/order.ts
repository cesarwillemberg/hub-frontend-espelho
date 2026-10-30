import type { PageResponse } from "./product";

/**
 * Tipos de pedido consumidos pelo frontend.
 *
 * O hubbackend (BFF) converte as respostas do Core API de snake_case para
 * camelCase, portanto o contrato frontend↔BFF é sempre camelCase. Os campos
 * refletem os DTOs do Core API (`OrderSummaryResponse`, `OrderDetailsResponse`
 * e `OrderStatusUpdateResponse`).
 */

export type OrderStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

/** Linha da listagem (`GET /api/orders`). */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  paymentStatus: string | null;
  itemsCount: number;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

/** Cliente retornado no detalhe do pedido. */
export interface OrderCustomer {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/** Item do pedido retornado no detalhe. */
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Detalhe do pedido (`GET /api/orders/{orderId}`). */
export interface OrderDetails {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  status: OrderStatus;
  paymentStatus: string | null;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Resposta de `PATCH /api/orders/{orderId}/status`. */
export interface OrderStatusUpdate {
  id: string;
  orderNumber: string;
  previousStatus: OrderStatus;
  status: OrderStatus;
  cancelReason: string | null;
  cancelledAt: string | null;
  updatedAt: string;
}

/** Página de resumos de pedido (`content`, `page`, `size`, totais). */
export type OrderPageResponse = PageResponse<OrderSummary>;

/** Transições de status permitidas pelo Core API. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Próximo status de avanço (sem contar cancelamento), se houver. */
export function nextAdvanceStatus(status: OrderStatus): OrderStatus | null {
  if (status === "PENDING") return "PREPARING";
  if (status === "PREPARING") return "SHIPPED";
  if (status === "SHIPPED") return "DELIVERED";
  return null;
}

/** Se o pedido pode ser cancelado no status atual. */
export function canCancelStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].includes("CANCELLED");
}
