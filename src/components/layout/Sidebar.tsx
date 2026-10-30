"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  faClipboardList,
  faStore,
  faCartShopping,
  faTag,
  faBullhorn,
  faUsers,
  faClipboard,
  faBell,
  faBars,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faGear,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

const faTagUnique = faTag;

interface NavItem {
  href: string;
  label: string;
  icon: IconProp;
  /** Permissão exigida para exibir o item (verificação de UX apenas; o
   * Core API continua sendo a autoridade nas chamadas). */
  permission?: string | string[];
}

interface Section {
  title: string;
  items: NavItem[];
}

const SECTIONS: Section[] = [
  {
    title: "Operação",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: faClipboardList },
      { href: "/products", label: "Produtos", icon: faStore },
      { href: "/orders", label: "Pedidos", icon: faCartShopping, permission: "orders:read" },
      { href: "/notifications", label: "Notificações", icon: faBell, permission: ["orders:read", "stock:read"] },
      { href: "/categories", label: "Categorias", icon: faTagUnique, permission: "products:read" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/promotions", label: "Promoções", icon: faBullhorn, permission: ["promotions:read", "promotions:manage"] },
      { href: "/tickets", label: "Cupons", icon: faTagUnique, permission: ["coupons:read", "coupons:manage"] },
    ],
  },
  {
    title: "Administração",
    items: [
      { href: "/users", label: "Usuários", icon: faUsers, permission: ["users:read", "users:manage"] },
      { href: "/audit", label: "Auditoria", icon: faClipboard, permission: ["audit:read", "activity_logs:read"] },
    ],
  },
];

export function Sidebar({
  collapsed: collapsedProp,
  setCollapsed: setCollapsedProp,
}: {
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void;
} = {}) {
  const { user, tenant, logout, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(
    typeof window === "undefined" ? false : window.innerWidth < 1024,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = collapsedProp ?? internalCollapsed;
  const setCollapsed = setCollapsedProp ?? setInternalCollapsed;

  // Itens com permissão definida só aparecem para usuários que a possuem.
  // Verificação de UX apenas — o Core API continua rejeitando chamadas diretas.
  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !item.permission ||
        (Array.isArray(item.permission)
          ? item.permission.some(hasPermission)
          : hasPermission(item.permission)),
    ),
  })).filter((section) => section.items.length > 0);

  const isActive = (href: string) => pathname === href;

  const handleNavigate = (href: string) => {
    router.push(href);
    if (collapsed) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {collapsed && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 bg-surface border-r border-border",
          collapsed
            ? "w-[var(--mh-sidebar-collapsed-width)]"
            : "w-[var(--mh-sidebar-width)]",
          "transition-all duration-200 overflow-visible flex flex-col",
          "hidden md:flex",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="shrink-0 flex h-16 items-center justify-between px-3 border-b border-border">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mh-dash-btn--ghost mh-dash-btn--icon"
              aria-label={collapsed ? "Expandir navegação" : "Colapsar navegação"}
              title={collapsed ? "Expandir navegação" : "Colapsar navegação"}
            >
              <FontAwesomeIcon
                icon={collapsed ? faChevronRight : faChevronLeft}
                className={cn("w-4 h-4", collapsed ? "rotate-180" : "")}
              />
            </button>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCartShopping} className="text-primary" />
                <span className="font-bold text-lg tracking-tight">Marvi Hub</span>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1" aria-label="Navegação principal">
            {visibleSections.map((section) => (
              <div key={section.title} className="mb-2">
                {!collapsed && (
                  <h3 className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleNavigate(item.href)}
                      className={cn(
                        "flex w-full items-center justify-left gap-2 px-2 py-2 rounded-xl transition-all duration-150",
                        active
                          ? "bg-white/5 text-foreground"
                          : "text-foreground/80 hover:bg-surface-muted hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-left text-foreground shrink-0",
                          collapsed ? "h-6 w-6 rounded-lg" : "h-5 w-5",
                        )}
                      >
                        <FontAwesomeIcon
                          icon={item.icon}
                          className={cn("w-4 h-4", collapsed ? "w-3 h-3" : "")}
                        />
                      </div>
                      <span className={cn("whitespace-nowrap", collapsed ? "hidden" : "block")}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-border p-2">
            <UserMenu
              user={user}
              tenantName={tenant?.marketName}
              collapsed={collapsed}
              onSwitchMarket={() => router.push("/selecionar-mercado")}
              onSettings={() => router.push("/config")}
              onLogout={() => void logout()}
            />
          </div>
        </div>
      </aside>

      {/* Mobile drawer button (shown on topbar) and drawer panel */}
      <button
        className="md:hidden mh-dash-btn--ghost mh-dash-btn--icon"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
      >
        <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
      </button>

      {collapsed && (
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 bg-surface border-r border-border w-80 transform transition-transform duration-200 flex flex-col",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Menu mobile"
          role="navigation"
        >
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCartShopping} className="text-primary" />
              <span className="font-bold text-lg tracking-tight">Marvi Hub</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="mh-dash-btn--ghost mh-dash-btn--icon"
              aria-label="Fechar menu"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {visibleSections.map((section) => (
              <div key={section.title} className="mb-3">
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleNavigate(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-colors",
                        active
                          ? "bg-white/5 text-foreground border-r-2 border-white"
                          : "text-foreground/80 hover:bg-surface-muted border-r-2 border-transparent",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <UserMenu
              user={user}
              tenantName={tenant?.marketName}
              onSwitchMarket={() => {
                setMobileOpen(false);
                router.push("/selecionar-mercado");
              }}
              onSettings={() => {
                setMobileOpen(false);
                router.push("/config");
              }}
              onLogout={() => void logout()}
            />
          </div>
        </div>
      )}
    </>
  );
}

function UserMenu({
  user,
  tenantName,
  collapsed = false,
  onSwitchMarket,
  onSettings,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>["user"];
  tenantName?: string;
  collapsed?: boolean;
  onSwitchMarket: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = user?.name?.trim() || "Usuário";
  const initial = name.charAt(0).toLocaleUpperCase("pt-BR") || "U";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      {open && (
        <div
          role="menu"
          aria-label="Menu da conta"
          className={cn(
            "absolute bottom-full z-50 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-xl",
            collapsed ? "left-2" : "inset-x-0",
          )}
        >
          <div className="flex items-center gap-3 px-2 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? user?.roles?.[0]?.name ?? "Conta pessoal"}
              </p>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          {tenantName && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSwitchMarket();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-foreground hover:bg-surface-muted"
            >
              <FontAwesomeIcon icon={faStore} className="w-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Trocar mercado</span>
              <span className="max-w-24 truncate text-xs text-muted-foreground">{tenantName}</span>
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-foreground hover:bg-surface-muted"
          >
            <FontAwesomeIcon icon={faGear} className="w-4 text-muted-foreground" />
            <span>Configurações</span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-foreground hover:bg-surface-muted"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="w-4 text-muted-foreground" />
            <span>Sair</span>
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Fechar menu da conta" : `Abrir menu da conta de ${name}`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center rounded-xl text-left transition-colors hover:bg-surface-muted",
          collapsed ? "justify-center p-2" : "gap-2.5 px-2 py-2",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {initial}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.roles?.[0]?.name ?? "Conta pessoal"}
              </span>
            </span>
            <FontAwesomeIcon
              icon={faChevronUp}
              className={cn("w-3 text-muted-foreground transition-transform", open ? "rotate-180" : "")}
            />
          </>
        )}
      </button>
    </div>
  );
}
