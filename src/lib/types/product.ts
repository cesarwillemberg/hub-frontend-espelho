export interface ProductCategoryRef {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  promotionalPrice: number | null;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  lowStock: boolean;
  imageUrl: string | null;
  active: boolean;
  category: ProductCategoryRef | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  canonicalCategory?: CatalogCategory | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CatalogCategory {
  id: string;
  key: string;
  name: string;
  active: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CategoryRequest {
  name: string;
  description: string | null;
  canonicalKey: string | null;
  active: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type StockOperation = "SET" | "INCREMENT" | "DECREMENT";

export interface StockMovement {
  id: string;
  operation: StockOperation;
  previousQuantity: number | null;
  changedQuantity: number;
  newQuantity: number;
  reason: string | null;
  performedByUserId: string | null;
  createdAt: string;
}

export interface ProductImageUploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
}
