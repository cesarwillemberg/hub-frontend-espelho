import type { PageResponse } from "./product";

export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export interface CouponSummary {
  id: string;
  code: string;
  name: string;
  type: CouponType;
  discountValue: number | null;
  minimumOrderValue: number | null;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface Coupon extends CouponSummary {
  description: string | null;
  perCustomerLimit: number | null;
  updatedAt: string;
}

export interface CouponPayload {
  code: string;
  name: string;
  description?: string | null;
  type: CouponType;
  discountValue?: number | null;
  minimumOrderValue?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export type CouponPage = PageResponse<CouponSummary>;
