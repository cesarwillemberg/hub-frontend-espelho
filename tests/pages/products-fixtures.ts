import type {
  Category,
  PageResponse,
  Product,
  StockMovement,
} from "@/lib/types/product";

export const category1: Category = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  name: "Mercearia",
  description: null,
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
};

export const category2: Category = {
  id: "aaaaaaaa-0000-0000-0000-000000000002",
  name: "Bebidas",
  description: null,
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
};

export const product1: Product = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Arroz Branco 5kg",
  description: "Pacote de 5kg",
  sku: "ARR-5KG",
  barcode: "7891234567890",
  price: 24.9,
  promotionalPrice: null,
  stockQuantity: 2,
  lowStockThreshold: 5,
  lowStock: true,
  imageUrl: null,
  active: true,
  category: { id: category1.id, name: category1.name },
  createdAt: "2026-01-05T10:00:00Z",
  updatedAt: "2026-01-05T10:00:00Z",
  deletedAt: null,
};

export const product2: Product = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Refrigerante Cola 2L",
  description: null,
  sku: "REF-2L",
  barcode: null,
  price: 9.99,
  promotionalPrice: 7.99,
  stockQuantity: 40,
  lowStockThreshold: 10,
  lowStock: false,
  imageUrl: null,
  active: false,
  category: { id: category2.id, name: category2.name },
  createdAt: "2026-01-06T10:00:00Z",
  updatedAt: "2026-01-06T10:00:00Z",
  deletedAt: null,
};

export const movement1: StockMovement = {
  id: "44444444-4444-4444-4444-444444444444",
  operation: "INCREMENT",
  previousQuantity: 2,
  changedQuantity: 10,
  newQuantity: 12,
  reason: "Recebimento de mercadoria",
  performedByUserId: "55555555-5555-5555-5555-555555555555",
  createdAt: "2026-10-01T12:00:00Z",
};

export const movement2: StockMovement = {
  id: "44444444-4444-4444-4444-444444444445",
  operation: "DECREMENT",
  previousQuantity: 12,
  changedQuantity: 3,
  newQuantity: 9,
  reason: "Venda em loja",
  performedByUserId: "55555555-5555-5555-5555-555555555555",
  createdAt: "2026-10-02T08:30:00Z",
};

export function productsPage(
  content: Product[],
  totalElements = content.length,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<Product> {
  return { content, page: 0, size: 10, totalElements, totalPages };
}

export function categoriesPage(content: Category[]): PageResponse<Category> {
  return {
    content,
    page: 0,
    size: 200,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
  };
}

export function movementsPage(
  content: StockMovement[],
  totalElements = content.length,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<StockMovement> {
  return { content, page: 0, size: 5, totalElements, totalPages };
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
