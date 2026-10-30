"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faBoxArchive,
  faCheckCircle,
  faClock,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { OrderStatus } from "@/lib/types/order";

const STATUS_BADGES: Record<
  OrderStatus,
  { label: string; icon: IconDefinition; className: string }
> = {
  PENDING: {
    label: "Pendente",
    icon: faClock,
    className: "bg-warning/10 text-warning border border-warning/20",
  },
  PREPARING: {
    label: "Preparando",
    icon: faBoxArchive,
    className: "bg-primary/10 text-primary border border-primary/20",
  },
  SHIPPED: {
    label: "Enviado",
    icon: faTruck,
    className: "bg-info/10 text-info border border-info/20",
  },
  DELIVERED: {
    label: "Entregue",
    icon: faCheckCircle,
    className: "bg-positive/10 text-positive border border-positive/20",
  },
  CANCELLED: {
    label: "Cancelado",
    icon: faBan,
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(STATUS_BADGES).map(([status, info]) => [status, info.label]),
) as Record<OrderStatus, string>;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const info = STATUS_BADGES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${info.className}`}
    >
      <FontAwesomeIcon icon={info.icon} className="h-3 w-3" />
      {info.label}
    </span>
  );
}
