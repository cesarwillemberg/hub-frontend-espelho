"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faBoxOpen, faCartShopping, faCheck, faRotate } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationItem, NotificationPageResponse, NotificationUnreadCountResponse } from "@/lib/types/notifications";

const PAGE_SIZE = 10;

function emitNotificationChange() {
  window.dispatchEvent(new Event("marvi:notifications-changed"));
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), unreadOnly: String(unreadOnly) });
      const [result, count] = await Promise.all([
        api.get<NotificationPageResponse>(`/api/notifications?${query.toString()}`),
        api.get<NotificationUnreadCountResponse>("/api/notifications/unread-count"),
      ]);
      setItems(result.content);
      setTotalPages(result.totalPages);
      setUnreadCount(count.unreadCount);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar suas notificações."));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const markOneRead = async (notification: NotificationItem) => {
    if (notification.readAt) return true;
    setUpdatingId(notification.id);
    setActionError(null);
    try {
      await api.patch(`/api/notifications/${notification.id}/read`);
      setItems((current) => unreadOnly
        ? current.filter((item) => item.id !== notification.id)
        : current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((current) => current === null ? current : Math.max(0, current - 1));
      emitNotificationChange();
      return true;
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Não foi possível marcar a notificação como lida."));
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!(await markOneRead(notification))) return;
    const target = notification.targetPath === "/orders" || notification.targetPath === "/products"
      ? notification.targetPath
      : null;
    if (target) router.push(target);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await api.patch("/api/notifications/read-all");
      const now = new Date().toISOString();
      setItems((current) => unreadOnly
        ? []
        : current.map((item) => item.readAt ? item : { ...item, readAt: now }));
      if (unreadOnly) {
        setPage(0);
        setTotalPages(0);
      }
      setUnreadCount(0);
      emitNotificationChange();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Não foi possível marcar todas como lidas."));
    } finally {
      setMarkingAll(false);
    }
  };

  const selectFilter = (next: boolean) => {
    setUnreadOnly(next);
    setPage(0);
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Central de avisos</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount === null ? "Veja atualizações importantes do seu mercado." : `${unreadCount} não lida${unreadCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={markingAll || unreadCount === 0}
          className="mh-dash-btn mh-dash-btn--outline disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
          {markingAll ? "Atualizando…" : "Marcar todas como lidas"}
        </button>
      </div>

      <div className="flex gap-2 border-b border-border" role="tablist" aria-label="Filtrar notificações">
        {[{ label: "Todas", value: false }, { label: "Não lidas", value: true }].map((filter) => (
          <button
            key={filter.label}
            type="button"
            role="tab"
            aria-selected={unreadOnly === filter.value}
            onClick={() => selectFilter(filter.value)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${unreadOnly === filter.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {actionError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{actionError}</p>}

      {loading ? (
        <div className="space-y-3" aria-label="Carregando notificações">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p role="alert" className="text-sm text-muted-foreground">{error}</p>
          <button type="button" onClick={() => void load()} className="mh-dash-btn mh-dash-btn--outline mt-4">
            <FontAwesomeIcon icon={faRotate} className="h-3.5 w-3.5" /> Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={faBell} title={unreadOnly ? "Tudo em dia" : "Nenhuma notificação"} description={unreadOnly ? "Você não tem notificações não lidas." : "Quando houver uma novidade, ela aparecerá aqui."} />
      ) : (
        <div className="space-y-3">
          {items.map((notification) => {
            const isUnread = !notification.readAt;
            const icon = notification.type === "LOW_STOCK" ? faBoxOpen : faCartShopping;
            return (
              <article key={notification.id} className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${isUnread ? "border-primary/30 bg-primary/[0.04]" : "border-border bg-surface"}`}>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${notification.type === "LOW_STOCK" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                  <FontAwesomeIcon icon={icon} className="h-4 w-4" />
                </div>
                <button type="button" onClick={() => void openNotification(notification)} disabled={updatingId === notification.id} className="min-w-0 flex-1 text-left disabled:opacity-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium text-foreground">{notification.title}</h2>
                    {isUnread && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Não lida" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.createdAt}>
                    {new Date(notification.createdAt).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </button>
                {isUnread && (
                  <button type="button" aria-label={`Marcar como lida: ${notification.title}`} onClick={() => void markOneRead(notification)} disabled={updatingId === notification.id} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50">
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav className="flex items-center justify-between pt-2" aria-label="Paginação de notificações">
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="mh-dash-btn mh-dash-btn--outline disabled:opacity-50">Anterior</button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="mh-dash-btn mh-dash-btn--outline disabled:opacity-50">Próxima</button>
        </nav>
      )}
    </section>
  );
}
