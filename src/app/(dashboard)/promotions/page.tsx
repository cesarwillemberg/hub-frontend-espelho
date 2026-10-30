"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullhorn, faChevronDown, faEdit, faFilter, faPlus, faRotate, faSearch, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/formatters";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConfirmDialog } from "@/components/products/ConfirmDialog";
import type { PageResponse, Product, Category } from "@/lib/types/product";
import type { Promotion, PromotionPayload, PromotionScope, PromotionSummary, PromotionType } from "@/lib/types/promotion";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const filterSelectClass = "h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-foreground outline-none transition-colors hover:border-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function discountLabel(type: PromotionType, value: number) {
  if (type === "PERCENTAGE") return `${value}%`;
  if (type === "FIXED_AMOUNT") return `${formatCurrency(Number(value))} de desconto`;
  return `Preço promocional ${formatCurrency(Number(value))}`;
}

function validityLabel(promotion: PromotionSummary, now: number) {
  if (!promotion.active) return "Inativa";
  if (promotion.startsAt && new Date(promotion.startsAt).getTime() > now) return "Agendada";
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() < now) return "Expirada";
  return "Ativa";
}

function validityClass(status: string) {
  if (status === "Ativa") return "border-positive/20 bg-positive/10 text-positive";
  if (status === "Agendada") return "border-primary/20 bg-primary/10 text-primary";
  return "border-border bg-surface-muted text-muted-foreground";
}

export default function PromotionsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission("promotions:read") || hasPermission("promotions:manage");
  const canManage = hasPermission("promotions:manage");
  const [promotions, setPromotions] = useState<PromotionSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<PromotionType | "">("");
  const [scopeFilter, setScopeFilter] = useState<PromotionScope | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editor, setEditor] = useState<Promotion | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNow(Date.now());
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());
    if (activeFilter) params.set("active", activeFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (scopeFilter) params.set("scope", scopeFilter);
    try {
      const response = await api.get<PageResponse<PromotionSummary>>(`/api/promotions?${params}`);
      setPromotions(response.content ?? []);
      setTotalPages(response.totalPages ?? 0);
      setTotalElements(response.totalElements ?? 0);
    } catch (err) {
      setPromotions([]);
      setError(getApiErrorMessage(err, "Não foi possível carregar as promoções."));
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter, typeFilter, scopeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPromotions();
  }, [loadPromotions, refreshKey]);

  async function editPromotion(id: string) {
    setError(null);
    setActionId(id);
    try {
      setEditor(await api.get<Promotion>(`/api/promotions/${id}`));
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível abrir esta promoção."));
    } finally {
      setActionId(null);
    }
  }

  async function togglePromotion(promotion: PromotionSummary, nextActive: boolean) {
    setActionId(promotion.id);
    try {
      await api.patch(`/api/promotions/${promotion.id}/status`, { active: nextActive });
      if (activeFilter && activeFilter !== String(nextActive)) {
        const nextTotal = Math.max(0, totalElements - 1);
        const nextPages = Math.ceil(nextTotal / PAGE_SIZE);
        setPromotions((current) => current.filter((item) => item.id !== promotion.id));
        setTotalElements(nextTotal);
        setTotalPages(nextPages);
        if (page > 0 && promotions.length === 1) setPage(Math.max(0, nextPages - 1));
      } else {
        setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, active: nextActive } : item));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível alterar o status da promoção."));
    } finally {
      setActionId(null);
    }
  }

  async function deletePromotion() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/promotions/${deleteTarget.id}`);
      setDeleteTarget(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Não foi possível excluir a promoção."));
    } finally {
      setDeleting(false);
    }
  }

  const onSaved = () => {
    setEditor(null);
    setRefreshKey((value) => value + 1);
  };

  const filtersActive = Boolean(searchInput.trim() || activeFilter || typeFilter || scopeFilter);
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setActiveFilter("");
    setTypeFilter("");
    setScopeFilter("");
    setPage(0);
  };

  if (!canRead) {
    return <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Você não tem permissão para consultar promoções.</div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FontAwesomeIcon icon={faBullhorn} className="text-lg" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Promoções</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe ofertas e descontos de produtos e categorias.</p>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <span className="text-sm text-muted-foreground"><strong className="font-semibold text-foreground">{totalElements}</strong> {totalElements === 1 ? "promoção" : "promoções"}</span>
          {canManage && <button type="button" onClick={() => setEditor("new")} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><FontAwesomeIcon icon={faPlus} /> Nova promoção</button>}
        </div>
      </header>

      <section aria-label="Filtros de promoções" className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><FontAwesomeIcon icon={faFilter} className="text-primary" /> Filtrar promoções</div>
          {filtersActive && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"><FontAwesomeIcon icon={faXmark} /> Limpar filtros</button>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(250px,1.7fr)_repeat(3,minmax(150px,1fr))]">
          <div>
            <label htmlFor="promotion-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">Buscar por nome</label>
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <input id="promotion-search" type="search" aria-label="Buscar promoções" placeholder="Ex.: oferta de verão" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div>
            <label htmlFor="promotion-status-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
            <div className="relative"><select id="promotion-status-filter" aria-label="Filtrar promoções por status" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(0); }} className={filterSelectClass}><option value="">Todos os status</option><option value="true">Ativas</option><option value="false">Inativas</option></select><FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground" /></div>
          </div>
          <div>
            <label htmlFor="promotion-type-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo de oferta</label>
            <div className="relative"><select id="promotion-type-filter" aria-label="Filtrar promoções por tipo" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as PromotionType | ""); setPage(0); }} className={filterSelectClass}><option value="">Todos os tipos</option><option value="PERCENTAGE">Percentual</option><option value="FIXED_AMOUNT">Valor fixo</option><option value="PROMOTIONAL_PRICE">Preço promocional</option></select><FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground" /></div>
          </div>
          <div>
            <label htmlFor="promotion-scope-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">Aplicação</label>
            <div className="relative"><select id="promotion-scope-filter" aria-label="Filtrar promoções por escopo" value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value as PromotionScope | ""); setPage(0); }} className={filterSelectClass}><option value="">Todos os escopos</option><option value="PRODUCTS">Produtos</option><option value="CATEGORIES">Categorias</option></select><FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground" /></div>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><span>{error}</span><button type="button" onClick={() => { setLoading(true); void loadPromotions(); }} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-surface-muted"><FontAwesomeIcon icon={faRotate} /> Tentar novamente</button></div>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface px-4 sm:px-5">
        {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} height="3.5rem" radius="0.5rem" />)}</div> : error ? null : promotions.length === 0 ? <EmptyState icon={faBullhorn} title="Nenhuma promoção encontrada" description="Crie uma promoção ou ajuste os filtros para ver resultados." action={canManage ? <button type="button" onClick={() => setEditor("new")} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><FontAwesomeIcon icon={faPlus} /> Nova promoção</button> : undefined} /> : (
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><th className="py-3">Promoção</th><th className="py-3">Desconto</th><th className="py-3">Aplicação</th><th className="py-3">Período</th><th className="py-3">Status</th><th className="py-3 text-right">Ações</th></tr></thead>
            <tbody>{promotions.map((promotion) => <tr key={promotion.id} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
              <td className="py-3"><div className="font-medium">{promotion.name}</div><div className="text-xs text-muted-foreground">Criada em {formatDate(promotion.createdAt)}</div></td>
              <td className="py-3">{discountLabel(promotion.type, Number(promotion.discountValue))}</td>
              <td className="py-3 text-muted-foreground">{promotion.scope === "PRODUCTS" ? "Produtos" : "Categorias"} · {promotion.itemsCount} {promotion.itemsCount === 1 ? "item" : "itens"}</td>
              <td className="py-3 text-sm text-muted-foreground">{formatDate(promotion.startsAt)}<br />até {formatDate(promotion.endsAt)}</td>
              <td className="py-3"><div className="flex items-center">{canManage ? <ToggleSwitch ariaLabel={`${validityLabel(promotion, now)}. ${promotion.active ? "Desativar" : "Ativar"} promoção ${promotion.name}`} checked={promotion.active} onCheckedChange={(checked) => void togglePromotion(promotion, checked)} disabled={actionId !== null} /> : <span className={`rounded border px-2 py-1 text-xs font-medium ${validityClass(validityLabel(promotion, now))}`}>{validityLabel(promotion, now)}</span>}</div></td>
              <td className="py-3 text-right whitespace-nowrap">{canManage && <><button type="button" disabled={actionId !== null} aria-label={`Editar ${promotion.name}`} title="Editar" onClick={() => void editPromotion(promotion.id)} className="mr-3 text-primary hover:underline disabled:opacity-50"><FontAwesomeIcon icon={faEdit} /></button><button type="button" disabled={actionId !== null} aria-label={`Excluir ${promotion.name}`} title="Excluir (remoção lógica)" onClick={() => { setDeleteError(null); setDeleteTarget(promotion); }} className="rounded-md p-1 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /></button></>}</td>
            </tr>)}</tbody>
          </table>
        )}
      </div>

      {!loading && !error && promotions.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm"><span className="text-muted-foreground">Exibindo <strong className="font-medium text-foreground">{promotions.length}</strong> de <strong className="font-medium text-foreground">{totalElements}</strong> promoções</span><div className="flex items-center gap-3"><span className="text-muted-foreground">Página {page + 1} de {Math.max(totalPages, 1)}</span><button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40">Anterior</button><button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= totalPages - 1} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40">Próxima</button></div></div>}

      {editor && <PromotionEditor promotion={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={onSaved} />}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir promoção?"
        message={deleteTarget ? <>A promoção <strong className="text-foreground">{deleteTarget.name}</strong> será excluída logicamente e deixará de aparecer nas promoções disponíveis. Esta ação não pode ser desfeita por esta tela.</> : null}
        confirmLabel="Excluir promoção"
        cancelLabel="Manter promoção"
        destructive
        loading={deleting}
        error={deleteError}
        onConfirm={() => void deletePromotion()}
        onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null); } }}
      />
    </div>
  );
}

function PromotionEditor({ promotion, onClose, onSaved }: { promotion: Promotion | null; onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(promotion?.name ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [type, setType] = useState<PromotionType>(promotion?.type ?? "PERCENTAGE");
  const [scope, setScope] = useState<PromotionScope>(promotion?.scope ?? "PRODUCTS");
  const [discountValue, setDiscountValue] = useState(String(promotion?.discountValue ?? ""));
  const [productIds, setProductIds] = useState<string[]>(promotion?.products.map((item) => item.id) ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(promotion?.categories.map((item) => item.id) ?? []);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [startsAt, setStartsAt] = useState(promotion?.startsAt?.slice(0, 16) ?? "");
  const [endsAt, setEndsAt] = useState(promotion?.endsAt?.slice(0, 16) ?? "");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<PageResponse<Product>>("/api/products?page=0&size=100&active=true"),
      api.get<PageResponse<Category>>("/api/categories?page=0&size=100&active=true"),
    ]).then(([productPage, categoryPage]) => {
      if (!cancelled) { setProducts(productPage.content ?? []); setCategories(categoryPage.content ?? []); }
    }).catch((err) => { if (!cancelled) setFormError(getApiErrorMessage(err, "Não foi possível carregar produtos e categorias.")); })
      .finally(() => { if (!cancelled) setTargetsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function toggleTarget(id: string, checked: boolean, update: (updater: (current: string[]) => string[]) => void) {
    update((current) => checked
      ? (current.includes(id) ? current : [...current, id])
      : current.filter((item) => item !== id));
  }

  const visibleProducts = products.filter((product) => {
    const matchesName = product.name.toLocaleLowerCase("pt-BR").includes(productSearch.trim().toLocaleLowerCase("pt-BR"));
    const matchesCategory = !productCategoryFilter || product.category?.id === productCategoryFilter;
    return matchesName && matchesCategory;
  });
  const allVisibleProductsSelected = visibleProducts.length > 0 && visibleProducts.every((product) => productIds.includes(product.id));
  const visibleCategories = categories.filter((category) => category.name.toLocaleLowerCase("pt-BR").includes(categorySearch.trim().toLocaleLowerCase("pt-BR")));

  function toggleVisibleProducts(checked: boolean) {
    const visibleIds = visibleProducts.map((product) => product.id);
    setProductIds((current) => checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleIds.includes(id)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!name.trim()) { setFormError("Informe o nome da promoção."); return; }
    if (!Number.isFinite(Number(discountValue)) || Number(discountValue) <= 0) { setFormError("Informe um valor de desconto maior que zero."); return; }
    if (type === "PERCENTAGE" && Number(discountValue) > 100) { setFormError("O desconto percentual não pode ultrapassar 100%."); return; }
    if (scope === "PRODUCTS" && productIds.length === 0) { setFormError("Selecione pelo menos um produto."); return; }
    if (scope === "CATEGORIES" && categoryIds.length === 0) { setFormError("Selecione pelo menos uma categoria."); return; }
    const start = startsAt ? new Date(startsAt).toISOString() : null;
    const end = endsAt ? new Date(endsAt).toISOString() : null;
    if (start && end && new Date(end) <= new Date(start)) { setFormError("O fim da promoção deve ser posterior ao início."); return; }
    const payload: PromotionPayload = { name: name.trim(), description: description.trim() || undefined, type, scope, discountValue: Number(discountValue), ...(scope === "PRODUCTS" ? { productIds } : { categoryIds }), startsAt: start, endsAt: end };
    setSaving(true);
    try {
      if (promotion) await api.put(`/api/promotions/${promotion.id}`, payload);
      else await api.post("/api/promotions", payload);
      onSaved();
    } catch (err) { setFormError(getApiErrorMessage(err, "Não foi possível salvar a promoção.")); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" onKeyDown={(event) => { if (event.key === "Escape" && !saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="promotion-form-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
      <header className="shrink-0 border-b border-border px-5 py-4 sm:px-7 sm:py-5">
        <h2 id="promotion-form-title" className="text-xl font-semibold tracking-tight">{promotion ? "Editar promoção" : "Nova promoção"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Defina a oferta, escolha os itens participantes e configure a vigência.</p>
      </header>
      <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        {formError && <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        <form id="promotion-form" onSubmit={(event) => void submit(event)} className="space-y-5">
          <section className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background/40 p-4 md:grid-cols-5">
            <div className="md:col-span-5"><label htmlFor="promotion-name" className={labelClass}>Nome da promoção</label><input id="promotion-name" maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Ex.: Oferta de verão" required /></div>
            <div className="md:col-span-5"><label htmlFor="promotion-description" className={labelClass}>Descrição <span className="font-normal text-muted-foreground">(opcional)</span></label><textarea id="promotion-description" value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-[42px] resize-y`} rows={2} placeholder="Detalhes da oferta" /></div>
            <div className="md:col-span-5"><h3 className="mb-3 text-sm font-semibold">Configuração da oferta</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><label htmlFor="promotion-type" className={labelClass}>Tipo de desconto</label><select id="promotion-type" value={type} onChange={(event) => setType(event.target.value as PromotionType)} className={inputClass}><option value="PERCENTAGE">Percentual (%)</option><option value="FIXED_AMOUNT">Valor fixo (R$)</option><option value="PROMOTIONAL_PRICE">Preço promocional (R$)</option></select></div>
              <div><label htmlFor="promotion-value" className={labelClass}>Valor</label><input id="promotion-value" type="number" min="0.01" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} className={inputClass} placeholder={type === "PERCENTAGE" ? "Ex.: 10" : "Ex.: 25,00"} required /></div>
              <div><label htmlFor="promotion-scope" className={labelClass}>Aplicar a</label><select id="promotion-scope" value={scope} onChange={(event) => setScope(event.target.value as PromotionScope)} className={inputClass}><option value="PRODUCTS">Produtos</option><option value="CATEGORIES">Categorias</option></select></div>
            </div></div>
          </section>

          <section className="rounded-xl border border-border p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-sm font-semibold">{scope === "PRODUCTS" ? "Produtos em promoção" : "Categorias em promoção"}</h3><p className="mt-1 text-xs text-muted-foreground">Pesquise e selecione os {scope === "PRODUCTS" ? "produtos" : "categorias"} que farão parte da oferta.</p></div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{scope === "PRODUCTS" ? productIds.length : categoryIds.length} selecionado(s)</span>
            </div>
            {scope === "PRODUCTS" ? <>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_minmax(180px,0.55fr)]">
                <div className="relative"><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" /><input type="search" aria-label="Pesquisar produtos pelo nome" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Pesquisar produto pelo nome..." className={`${inputClass} pl-9`} /></div>
                <select aria-label="Filtrar produtos por categoria" value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)} className={inputClass}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              </div>
              {targetsLoading ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Carregando produtos…</p> : products.length === 0 ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum produto ativo disponível.</p> : visibleProducts.length === 0 ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum produto corresponde à pesquisa e aos filtros.</p> : <div className="max-h-[340px] overflow-auto rounded-lg border border-border"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 z-10 bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="w-20 px-4 py-3"><ToggleSwitch ariaLabel="Selecionar todos os produtos visíveis" checked={allVisibleProductsSelected} onCheckedChange={toggleVisibleProducts} /></th><th className="px-3 py-3">Produto</th><th className="px-3 py-3">Categoria</th><th className="px-4 py-3 text-right">Preço</th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id} className="border-t border-border transition-colors hover:bg-surface-muted/50"><td className="px-4 py-3"><ToggleSwitch ariaLabel={`Selecionar ${product.name}`} checked={productIds.includes(product.id)} onCheckedChange={(checked) => toggleTarget(product.id, checked, setProductIds)} /></td><td className="px-3 py-3 font-medium text-foreground">{product.name}</td><td className="px-3 py-3 text-muted-foreground">{product.category?.name ?? "Sem categoria"}</td><td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(product.price))}</td></tr>)}</tbody></table></div>}
            </> : <>
              <div className="relative mb-3"><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" /><input type="search" aria-label="Pesquisar categorias pelo nome" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Pesquisar categoria pelo nome..." className={`${inputClass} pl-9`} /></div>
              {targetsLoading ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Carregando categorias…</p> : categories.length === 0 ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma categoria ativa disponível.</p> : visibleCategories.length === 0 ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma categoria corresponde à pesquisa.</p> : <div className="max-h-[340px] overflow-auto rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="w-20 px-4 py-3">Selecionar</th><th className="px-3 py-3">Categoria</th><th className="px-4 py-3 text-right">Situação</th></tr></thead><tbody>{visibleCategories.map((category) => <tr key={category.id} className="border-t border-border transition-colors hover:bg-surface-muted/50"><td className="px-4 py-3"><ToggleSwitch ariaLabel={`Selecionar ${category.name}`} checked={categoryIds.includes(category.id)} onCheckedChange={(checked) => toggleTarget(category.id, checked, setCategoryIds)} /></td><td className="px-3 py-3 font-medium text-foreground">{category.name}</td><td className="px-4 py-3 text-right text-muted-foreground">Ativa</td></tr>)}</tbody></table></div>}
            </>}
          </section>

          <section className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background/40 p-4 sm:grid-cols-2">
            <div><label htmlFor="promotion-start" className={labelClass}>Início da promoção <span className="font-normal text-muted-foreground">(opcional)</span></label><input id="promotion-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} /></div>
            <div><label htmlFor="promotion-end" className={labelClass}>Fim da promoção <span className="font-normal text-muted-foreground">(opcional)</span></label><input id="promotion-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputClass} /></div>
          </section>
        </form>
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-border bg-surface px-5 py-4 sm:px-7">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50">Cancelar</button>
        <button type="submit" form="promotion-form" disabled={saving || targetsLoading} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50">{saving ? "Salvando…" : promotion ? "Salvar alterações" : "Salvar promoção"}</button>
      </footer>
    </div>
  </div>;
}

