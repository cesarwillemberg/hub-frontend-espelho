"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  faBell,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { NotificationUnreadCountResponse } from "@/lib/types/notifications";

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, hasPermission } = useAuth();
  const canReadNotifications = hasPermission("orders:read") || hasPermission("stock:read");
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [searchOpen]);

  useEffect(() => {
    if (!isAuthenticated || !canReadNotifications) return;
    let active = true;
    const refreshCount = async () => {
      try {
        const result = await api.get<NotificationUnreadCountResponse>("/api/notifications/unread-count");
        if (active) setUnreadCount(result.unreadCount);
      } catch {
        if (active) setUnreadCount(null);
      }
    };
    void refreshCount();
    window.addEventListener("marvi:notifications-changed", refreshCount);
    return () => {
      active = false;
      window.removeEventListener("marvi:notifications-changed", refreshCount);
    };
  }, [isAuthenticated, canReadNotifications]);

  const displayedUnreadCount = isAuthenticated && canReadNotifications ? unreadCount : null;

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface/90 backdrop-blur-md px-4"
    >
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
          />
          <input
            type="text"
            placeholder="Buscar produtos, pedidos… (/ ou Ctrl+K)"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            ref={searchInputRef}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canReadNotifications && <Link
          href="/notifications"
          className="mh-dash-btn--ghost mh-dash-btn--icon relative"
          aria-label={displayedUnreadCount === null ? "Notificações" : `Notificações, ${displayedUnreadCount} não lidas`}
          title={displayedUnreadCount === null ? "Notificações" : `Notificações (${displayedUnreadCount} não lidas)`}
        >
          <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
          {displayedUnreadCount !== null && displayedUnreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-center text-[10px] leading-none font-bold text-white ring-2 ring-surface">{displayedUnreadCount > 99 ? "99+" : displayedUnreadCount}</span>}
        </Link>}
      </div>
    </header>
  );
}
