import type {
  OrderDetails,
  OrderPageResponse,
  OrderStatusUpdate,
  OrderSummary,
} from "@/lib/types/order";

export const orderPending: OrderSummary = {
  id: "11111111-1111-1111-1111-111111111111",
  orderNumber: "PED-0001",
  customerName: "Maria Souza",
  customerEmail: "maria@email.com",
  customerPhone: "11999999999",
  status: "PENDING",
  paymentStatus: "PAID",
  itemsCount: 2,
  subtotal: 50,
  discountTotal: 5,
  deliveryFee: 8,
  total: 53,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
};

export const orderPreparing: OrderSummary = {
  ...orderPending,
  id: "22222222-2222-2222-2222-222222222222",
  orderNumber: "PED-0002",
  customerName: "João Lima",
  customerEmail: "joao@email.com",
  customerPhone: null,
  status: "PREPARING",
  itemsCount: 1,
  total: 29.9,
  subtotal: 29.9,
  discountTotal: 0,
  deliveryFee: 0,
};

export const orderShipped: OrderSummary = {
  ...orderPending,
  id: "33333333-3333-3333-3333-333333333333",
  orderNumber: "PED-0003",
  customerName: "Ana Pereira",
  customerEmail: null,
  customerPhone: "1188887777",
  status: "SHIPPED",
};

export const orderDelivered: OrderSummary = {
  ...orderPending,
  id: "44444444-4444-4444-4444-444444444444",
  orderNumber: "PED-0004",
  customerName: "Carlos Alves",
  status: "DELIVERED",
};

export const orderCancelled: OrderSummary = {
  ...orderPending,
  id: "55555555-5555-5555-5555-555555555555",
  orderNumber: "PED-0005",
  customerName: "Bia Rocha",
  status: "CANCELLED",
};

export const orderDetails: OrderDetails = {
  id: orderPending.id,
  orderNumber: "PED-0001",
  customer: {
    name: "Maria Souza",
    email: "maria@email.com",
    phone: "11999999999",
  },
  status: "PENDING",
  paymentStatus: "PAID",
  items: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      productId: "77777777-7777-7777-7777-777777777777",
      productName: "Arroz Branco 5kg",
      sku: "ARR-5KG",
      quantity: 2,
      unitPrice: 20.5,
      totalPrice: 41,
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      productId: "88888888-8888-8888-8888-888888888888",
      productName: "Feijão Carioca 1kg",
      sku: "FEJ-1KG",
      quantity: 1,
      unitPrice: 9,
      totalPrice: 9,
    },
  ],
  subtotal: 50,
  discountTotal: 5,
  deliveryFee: 8,
  total: 53,
  deliveryAddress: "Rua A, 123",
  notes: "Entregar no portão",
  cancelReason: null,
  cancelledAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
};

export const statusUpdateResponse: OrderStatusUpdate = {
  id: orderPending.id,
  orderNumber: "PED-0001",
  previousStatus: "PENDING",
  status: "PREPARING",
  cancelReason: null,
  cancelledAt: null,
  updatedAt: "2026-10-02T10:00:00Z",
};

export function ordersPage(
  content: OrderSummary[],
  totalElements = content.length,
  totalPages = content.length > 0 ? 1 : 0,
): OrderPageResponse {
  return { content, page: 0, size: 10, totalElements, totalPages };
}

/**
 * Erro no mesmo formato produzido pelo cliente da API do frontend
 * (`err.status` + `err.data = { error, message }`).
 */
export function apiError(
  status: number,
  data: { error?: string; message?: unknown },
  fallbackMessage = "API error",
): Error & { status: number; data: unknown } {
  const error = new Error(fallbackMessage) as Error & {
    status: number;
    data: unknown;
  };
  error.status = status;
  error.data = data;
  return error;
}
