"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { api } from "@/lib/api/client";
import Link from "next/link";
import {
  faClipboardList,
  faStore,
  faTag,
  faCartShopping,
  faChartLine,
  faList,
  faBoxArchive,
  faClipboard,
  faPlus,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency, formatDateBR, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DashboardSummary {
  lowStockCount: number;
  pendingOrders: number;
  preparingOrders: number;
  todayRevenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number;
  createdAt: string;
  [key: string]: unknown;
}

interface LowStockProduct {
  id: string;
  name: string;
  stockQuantity: number;
  lowStockThreshold: number | null;
  effectiveLowStockThreshold?: number;
}

const STATUS_LABELS: Record<string, { labelKey: string; variant: "default" | "positive" | "negative" | "warning" }> = {
  PENDING: { labelKey: "dashboard.status.pending", variant: "warning" },
  PREPARING: { labelKey: "dashboard.status.preparing", variant: "default" },
  SHIPPED: { labelKey: "dashboard.status.shipped", variant: "default" },
  DELIVERED: { labelKey: "dashboard.status.delivered", variant: "positive" },
  CANCELLED: { labelKey: "dashboard.status.cancelled", variant: "negative" },
};

const PERIODS: Array<{ value: "today" | "7d" | "30d"; key: string }> = [
  { value: "today", key: "dashboard.periodToday" },
  { value: "7d", key: "dashboard.period7d" },
  { value: "30d", key: "dashboard.period30d" },
];

function groupOrdersByDate(orders: RecentOrder[]) {
  const byDate: Record<string, { revenue: number; count: number }> = {};
  for (const order of orders) {
    const date = new Date(order.createdAt).toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = { revenue: 0, count: 0 };
    byDate[date].revenue += order.total;
    byDate[date].count += 1;
  }
  return Object.entries(byDate).map(([date, data]) => ({ date, ...data }));
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [lowStockTotal, setLowStockTotal] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardSummary>("/api/dashboard/summary");
      if (data) setSummary(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage ?? t("dashboard.error.load"));
    }

    try {
      const data = await api.get<{
        content: LowStockProduct[];
        totalElements?: number;
      }>(
        "/api/products/low-stock?size=100",
      );
      if (data) {
        setLowStock(data.content ?? []);
        setLowStockTotal(data.totalElements ?? null);
      }
    } catch {
      // Ignorar erro de estoque baixo, não bloqueia o dashboard
    }

    try {
      const data = await api.get<{ content: RecentOrder[] }>("/api/orders?size=10");
      if (data) setRecentOrders(data.content ?? []);
    } catch {
      // Ignorar erro de pedidos recentes, não bloqueia o dashboard
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardError message={error} onRetry={loadData} t={t} />;
  }

  const totalRevenue = summary?.todayRevenue ?? 0;
  const pendingCount = summary?.pendingOrders ?? 0;
  const preparingCount = summary?.preparingOrders ?? 0;
  const lowStockCount = lowStockTotal ?? summary?.lowStockCount ?? lowStock.length;

  // Agrupa pedidos por data para o gráfico
  const ordersByDate = groupOrdersByDate(recentOrders).sort(
    (a, b) => a.date.localeCompare(b.date),
  );
  const chartHasData = ordersByDate.some((d) => d.revenue > 0);

  const periodLabel =
    period === "today" ? t("dashboard.periodToday") :
    period === "7d" ? t("dashboard.period7d") : t("dashboard.period30d");

  return (
    <div className="space-y-6">
      {/* ===== Cabeçalho da página ===== */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div
            className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5"
            role="radiogroup"
            aria-label={t("dashboard.periodToday")}
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  period === p.value
                    ? "bg-surface-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-checked={period === p.value}
                role="radio"
              >
                {t(p.key)}
              </button>
            ))}
          </div>
          <Link href="/orders" className="mh-dash-btn mh-dash-btn--primary">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" /> {t("dashboard.newOrder")}
          </Link>
        </div>
      </div>

      {/* ===== Cards de indicadores ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t("dashboard.kpi.pendingOrders")}
          value={formatNumber(pendingCount)}
          icon={faClipboardList}
          supportText={t("dashboard.kpi.pendingSupport")}
          href="/orders?status=PENDING"
        />
        <KpiCard
          title={t("dashboard.kpi.preparingOrders")}
          value={formatNumber(preparingCount)}
          icon={faStore}
          supportText={t("dashboard.kpi.preparingSupport")}
          href="/orders?status=PREPARING"
        />
        <KpiCard
          title={t("dashboard.kpi.lowStock")}
          value={formatNumber(lowStockCount)}
          icon={faTag}
          supportText={t("dashboard.kpi.lowStockSupport")}
          href="/products?lowStock=true"
        />
        <KpiCard
          title={t("dashboard.kpi.todayRevenue")}
          value={formatCurrency(totalRevenue)}
          icon={faCartShopping}
          supportText={t("dashboard.kpi.revenueSupport")}
          href="/orders"
        />
      </div>

      {/* ===== Conteúdo principal ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: Gráfico + Pedidos recentes (2/3) */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          {/* Gráfico de faturamento */}
          <section className="mh-dash-card p-5 flex-1" aria-labelledby="revenue-chart-title">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="revenue-chart-title" className="text-lg font-semibold text-foreground">
                  {t("dashboard.revenueChart.title")}
                </h2>
                <p className="text-muted-foreground text-sm">{periodLabel}</p>
              </div>
            </div>

            {chartHasData ? (
              <RevenueChart
                data={ordersByDate}
                totalRevenue={totalRevenue}
              />
            ) : (
              <EmptyState
                icon={faChartLine}
                title={t("dashboard.revenueChart.noSales")}
                description={t("dashboard.revenueChart.noSalesDesc")}
                className="py-6"
              />
            )}
          </section>

          {/* Pedidos recentes */}
          <section className="mh-dash-card p-5 flex-1" aria-labelledby="recent-orders-title">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="recent-orders-title" className="text-lg font-semibold text-foreground">
                  {t("dashboard.recentOrders.title")}
                </h2>
                <p className="text-muted-foreground text-sm">{t("dashboard.recentOrders.subtitle")}</p>
              </div>
              <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
                {t("dashboard.recentOrders.viewAll")} <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 ml-0.5" />
              </Link>
            </div>

            <DataTable<RecentOrder>
              columns={[
                { key: "orderNumber", label: t("dashboard.recentOrders.columns.order"), align: "left", width: "120px" },
                { key: "customerName", label: t("dashboard.recentOrders.columns.customer"), align: "left" },
                { key: "status", label: t("dashboard.recentOrders.columns.status"), align: "center", width: "140px", render: (v) => {
                  const info = STATUS_LABELS[String(v)];
                  return <Badge variant={info.variant}>{t(info.labelKey)}</Badge>;
                }},
                { key: "total", label: t("dashboard.recentOrders.columns.total"), align: "right", width: "110px", render: (v) => formatCurrency(Number(v)) },
                { key: "createdAt", label: t("dashboard.recentOrders.columns.date"), align: "left", width: "140px", render: (v) => formatDateBR(String(v)) },
              ]}
              data={recentOrders}
              emptyMessage={t("dashboard.recentOrders.empty")}
              emptyAction={
                <Link href="/orders" className="mh-dash-btn mh-dash-btn--compact mh-dash-btn--outline">
                  {t("dashboard.recentOrders.viewAllOrders")}
                </Link>
              }
            />
          </section>
        </section>

        {/* Coluna direita: Estoque crítico + Atividade recente (1/3) */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          {/* Estoque crítico */}
          <section className="mh-dash-card p-5 flex-1" aria-labelledby="critical-stock-title">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="critical-stock-title" className="text-lg font-semibold text-foreground">
                  {t("dashboard.criticalStock.title")}
                </h2>
                <p className="text-muted-foreground text-sm">{t("dashboard.criticalStock.subtitle")}</p>
              </div>
              <Link href="/products?lowStock=true" className="text-sm font-medium text-primary hover:underline">
                {t("dashboard.criticalStock.viewAll")} <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 ml-0.5" />
              </Link>
            </div>

            {lowStock.length === 0 ? (
              <EmptyState
                icon={faBoxArchive}
                title={t("dashboard.criticalStock.empty")}
                description={t("dashboard.criticalStock.emptyDesc")}
                action={
                  <Link href="/products" className="mh-dash-btn mh-dash-btn--compact mh-dash-btn--outline">
                    {t("dashboard.criticalStock.viewCatalog")}
                  </Link>
                }
                className="py-6"
              />
            ) : (
              <div
                className={cn(
                  "space-y-2",
                  lowStock.length > 4 && "max-h-[21rem] overflow-y-auto pr-1",
                )}
              >
                {lowStock.map((product) => {
                  const threshold = product.effectiveLowStockThreshold ?? product.lowStockThreshold ?? 5;
                  const pct = Math.min(100, Math.max(0, (product.stockQuantity / Math.max(threshold, 1)) * 100));
                  const isCritical = product.stockQuantity <= threshold;
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-transparent hover:bg-surface-muted hover:border-border transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                          <Badge variant="warning" className="text-[10px]">
                            {t("dashboard.criticalStock.columns.inStock").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="w-full bg-surface-muted rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isCritical ? "bg-[var(--mh-negative)]" : "bg-[var(--mh-warning)]",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{product.stockQuantity} {t("dashboard.criticalStock.columns.inStock")}</span>
                          <span>mín. {product.effectiveLowStockThreshold ?? product.lowStockThreshold ?? 5}</span>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Atividade recente */}
          <section className="mh-dash-card p-5 flex-1" aria-labelledby="recent-activity-title">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="recent-activity-title" className="text-lg font-semibold text-foreground">
                  {t("dashboard.recentActivity.title")}
                </h2>
                <p className="text-muted-foreground text-sm">{t("dashboard.recentActivity.subtitle")}</p>
              </div>
              <Link href="/audit" className="text-sm font-medium text-primary hover:underline">
                {t("dashboard.recentActivity.viewAll")} <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 ml-0.5" />
              </Link>
            </div>

            <EmptyState
              icon={faClipboard}
              title={t("dashboard.recentActivity.empty")}
              description={t("dashboard.recentActivity.emptyDesc")}
              className="py-6"
            />
          </section>
        </section>
      </div>

      {/* ===== Ações rápidas ===== */}
      <section className="mh-dash-card p-5" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="text-lg font-semibold text-foreground mb-4">
          {t("dashboard.quickActions.title")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { labelKey: "dashboard.quickActions.newProduct", icon: faStore, href: "/products" },
            { labelKey: "dashboard.quickActions.newOrder", icon: faCartShopping, href: "/orders" },
            { labelKey: "dashboard.quickActions.adjustStock", icon: faBoxArchive, href: "/products?lowStock=true" },
            { labelKey: "dashboard.quickActions.viewOrders", icon: faList, href: "/orders" },
          ].map((action) => (
            <Link
              key={action.labelKey}
              href={action.href}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 border border-border rounded-xl text-left transition-all duration-150",
                "hover:bg-surface-muted hover:border-white/50",
                "text-foreground hover:text-primary",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted">
                <FontAwesomeIcon icon={action.icon} className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{t(action.labelKey)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ===== Gráfico de faturamento ===== */

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number; count: number }>;
  totalRevenue: number;
}

function RevenueChart({ data, totalRevenue }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), totalRevenue);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-[140px]">
        {data.map((point, i) => {
          const pct = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
          const barHeight = Math.max(pct, 10);
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2" style={{ height: "100%" }}>
              <div className="flex-1 flex items-end gap-1">
                <div
                  className="w-full bg-primary/10 rounded-t-md transition-all group-hover:bg-primary/20 group"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{point.date}</span>
              <span className="text-xs font-medium text-foreground">{formatCurrency(point.revenue)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date ?? "-"}</span>
        <span>{data[data.length - 1]?.date ?? "-"}</span>
      </div>
    </div>
  );
}

/* ===== Skeleton ===== */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <SkeletonText count={2} height="1.5rem" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mh-dash-card p-5">
            <SkeletonText count={2} height="0.875rem" />
            <Skeleton className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 mh-dash-card p-5 h-[320px]">
          <SkeletonText count={2} height="1.125rem" />
          <div className="mt-6 h-32 w-full flex items-end gap-1 px-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-full w-full" />
            ))}
          </div>
        </section>

        <section className="mh-dash-card p-5 h-[240px]">
          <SkeletonText count={2} height="1.125rem" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 mh-dash-card p-5 h-[240px]">
          <SkeletonText count={2} height="1.125rem" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </section>

        <section className="mh-dash-card p-5 h-[240px]">
          <SkeletonText count={2} height="1.125rem" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </section>
      </div>

      <section className="mh-dash-card p-5">
        <SkeletonText count={1} height="1.125rem" />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ===== Erro ===== */

interface DashboardErrorProps {
  message: string;
  onRetry: () => void;
  t: TFunction;
}

function DashboardError({ message, onRetry, t }: DashboardErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-[var(--mh-negative)] text-sm mb-4">{message}</p>
      <button onClick={onRetry} className="mh-dash-btn mh-dash-btn--compact mh-dash-btn--outline">
        {t("dashboard.error.retry")}
      </button>
    </div>
  );
}
