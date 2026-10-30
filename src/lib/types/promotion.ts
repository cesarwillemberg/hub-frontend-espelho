export type PromotionType = "PERCENTAGE" | "FIXED_AMOUNT" | "PROMOTIONAL_PRICE";
export type PromotionScope = "PRODUCTS" | "CATEGORIES";

export interface PromotionSummary {
  id: string;
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  discountValue: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  itemsCount: number;
  createdAt: string;
}

export interface Promotion extends PromotionSummary {
  description: string | null;
  products: Array<{ id: string; name: string; price: number; promotionalPrice: number }>;
  categories: Array<{ id: string; name: string }>;
  updatedAt: string;
}

export interface PromotionPayload {
  name: string;
  description?: string;
  type: PromotionType;
  scope: PromotionScope;
  discountValue: number;
  productIds?: string[];
  categoryIds?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
}
