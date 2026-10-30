import {
  faBoxOpen,
  faSquareCheck,
  faTags,
  faTicket,
  faUsers,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";

import type { Feature } from "@/lib/types/home";

export const features: Feature[] = [
  { id: "products", icon: faBoxOpen, titleKey: "features.items.products.title", descriptionKey: "features.items.products.description" },
  { id: "inventory", icon: faWarehouse, titleKey: "features.items.inventory.title", descriptionKey: "features.items.inventory.description" },
  { id: "orders", icon: faSquareCheck, titleKey: "features.items.orders.title", descriptionKey: "features.items.orders.description" },
  { id: "promotions", icon: faTags, titleKey: "features.items.promotions.title", descriptionKey: "features.items.promotions.description" },
  { id: "users", icon: faUsers, titleKey: "features.items.users.title", descriptionKey: "features.items.users.description", highlight: true },
  { id: "coupons", icon: faTicket, titleKey: "features.items.coupons.title", descriptionKey: "features.items.coupons.description" },
];
