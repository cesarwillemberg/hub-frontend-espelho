import type { PageResponse } from "./product";

export type NotificationType = "ORDER_STATUS_UPDATED" | "LOW_STOCK";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetPath: string;
  referenceType: "ORDER" | "PRODUCT" | null;
  referenceId: string | null;
  createdAt: string;
  readAt: string | null;
}

export type NotificationPageResponse = PageResponse<NotificationItem>;

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}
