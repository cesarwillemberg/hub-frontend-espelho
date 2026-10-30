"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faRotate, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLogDetails, ActivityLogFilters, ActivityLogPage, ActivityLogSummary } from "@/lib/types/activity-log";

const PAGE_SIZE = 20;
const EMPTY_FILTERS: ActivityLogFilters = { search: "", action: "", entity: "", dateFrom: "", dateTo: "" };

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function AuditPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ActivityLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLogDetails | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const requestId = useRef(0);
  const detailRequestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    for (const [key, value] of Object.entries(appliedFilters)) {
      if (value.trim()) query.set(key, value.trim());
    }
    try {
      const data = await api.get<ActivityLogPage>(`/api/activity-logs?${query.toString()}`);
      if (currentRequest === requestId.current) setResult(data);
    } catch (err) {
      if (currentRequest === requestId.current) {
        const status = (err as { status?: number })?.status;
        setError(status === 403
          ? "Você não tem permissão para consultar a auditoria deste mercado."
          : getApiErrorMessage(err, "Não foi possível carregar os registros de auditoria."));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setFilterError("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    setFilterError(null);
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setFilterError(null);
    setPage(0);
  };

  const loadDetails = async (id: string) => {
    const currentRequest = ++detailRequestId.current;
    setSelectedLog(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const details = await api.get<ActivityLogDetails>(`/api/activity-logs/${id}`);
      if (currentRequest === detailRequestId.current) setSelectedLog(details);
    } catch (err) {
      if (currentRequest === detailRequestId.current) {
        setDetailError(getApiErrorMessage(err, "Não foi possível carregar os detalhes deste evento."));
      }
    } finally {
      if (currentRequest === detailRequestId.current) setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    detailRequestId.current += 1;
    setDetailId(null);
    setSelectedLog(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const showDetails = (log: ActivityLogSummary) => {
    setDetailId(log.id);
    void loadDetails(log.id);
  };

  const hasFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">Administração</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atividades registradas no mercado atual.</p>
      </header>

      <form onSubmit={applyFilters} className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-6" aria-label="Filtros de auditoria">
        <label className="space-y-1 text-sm xl:col-span-2">
          <span>Busca</span>
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Ação, entidade, descrição ou autor" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Ação</span>
          <input value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} placeholder="Ex.: PRODUCT_UPDATED" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Entidade</span>
          <input value={filters.entity} onChange={(event) => setFilters({ ...filters, entity: event.target.value })} placeholder="Ex.: PRODUCT" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Data inicial</span>
          <input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Data final</span>
          <input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-6">
          <button type="submit" className="mh-dash-btn mh-dash-btn--primary">Buscar</button>
          <button type="button" onClick={clearFilters} className="mh-dash-btn mh-dash-btn--outline">Limpar filtros</button>
          {filterError && <p role="alert" className="text-sm text-red-600">{filterError}</p>}
        </div>
      </form>

      {loading ? (
        <div className="space-y-3" aria-label="Carregando auditoria">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />)}</div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p role="alert" className="text-sm text-muted-foreground">{error}</p>
          <button type="button" onClick={() => void load()} className="mh-dash-btn mh-dash-btn--outline mt-4"><FontAwesomeIcon icon={faRotate} className="h-3.5 w-3.5" /> Tentar novamente</button>
        </div>
      ) : !result?.content.length ? (
        <EmptyState icon={faClipboard} title={hasFilters ? "Nenhum evento encontrado" : "Ainda não há registros"} description={hasFilters ? "Nenhum evento corresponde aos filtros informados." : "As atividades registradas neste mercado aparecerão aqui."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Data e hora</th><th className="px-4 py-3 font-medium">Ação</th><th className="px-4 py-3 font-medium">Entidade</th><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium">Autor</th><th className="px-4 py-3 font-medium">Detalhes</th></tr></thead>
              <tbody className="divide-y divide-border">
                {result.content.map((log) => <tr key={log.id} className="align-top"><td className="whitespace-nowrap px-4 py-3"><time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time></td><td className="px-4 py-3 font-medium">{log.action}</td><td className="px-4 py-3">{log.entity}{log.entityId && <span className="block max-w-40 truncate text-xs text-muted-foreground" title={log.entityId}>{log.entityId}</span>}</td><td className="max-w-sm px-4 py-3 text-muted-foreground">{log.description || "—"}</td><td className="px-4 py-3">{log.performedBy?.name || "Sistema"}</td><td className="px-4 py-3"><button type="button" onClick={() => void showDetails(log)} className="font-medium text-primary hover:underline">Abrir</button></td></tr>)}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-between" aria-label="Paginação da auditoria">
            <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="mh-dash-btn mh-dash-btn--outline disabled:opacity-50">Anterior</button>
            <span className="text-sm text-muted-foreground">Página {page + 1} de {Math.max(1, result.totalPages)} · {result.totalElements} registros</span>
            <button type="button" onClick={() => setPage((current) => Math.min(result.totalPages - 1, current + 1))} disabled={page >= result.totalPages - 1} className="mh-dash-btn mh-dash-btn--outline disabled:opacity-50">Próxima</button>
          </nav>
        </>
      )}

      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="max-h-[85vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-primary">Registro de atividade</p><h2 id="audit-detail-title" className="text-xl font-semibold">Detalhes do evento</h2></div><button type="button" aria-label="Fechar detalhes" onClick={closeDetails} className="rounded p-2 text-muted-foreground hover:bg-surface-muted"><FontAwesomeIcon icon={faXmark} /></button></div>
            {detailLoading ? <div className="space-y-3" aria-label="Carregando detalhes"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></div> : detailError ? <div><p role="alert" className="text-sm text-red-600">{detailError}</p><button type="button" onClick={() => void loadDetails(detailId)} className="mh-dash-btn mh-dash-btn--outline mt-3">Tentar novamente</button></div> : selectedLog && <dl className="grid gap-3 text-sm sm:grid-cols-2">{[
              ["Ação", selectedLog.action], ["Entidade", selectedLog.entity], ["ID da entidade", selectedLog.entityId], ["Autor", selectedLog.performedBy ? `${selectedLog.performedBy.name} (${selectedLog.performedBy.email})` : "Sistema"], ["Data e hora", formatDate(selectedLog.createdAt)], ["Descrição", selectedLog.description], ["Endereço IP", selectedLog.ipAddress], ["User-agent", selectedLog.userAgent],
            ].map(([label, value]) => <div key={label}><dt className="font-medium text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value || "—"}</dd></div>)}<div className="sm:col-span-2"><dt className="font-medium text-muted-foreground">Metadata</dt><dd className="mt-1 overflow-x-auto rounded-lg bg-surface-muted p-3"><pre className="whitespace-pre-wrap break-words">{JSON.stringify(selectedLog.metadata ?? {}, null, 2)}</pre></dd></div></dl>}
          </section>
        </div>
      )}
    </section>
  );
}
