"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTag, faPlus, faSearch, faRotate, faChevronDown, faTrash, faEdit, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/formatters";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConfirmDialog } from "@/components/products/ConfirmDialog";
import type { Coupon, CouponPage, CouponPayload, CouponSummary, CouponType } from "@/lib/types/coupon";

const PAGE_SIZE = 10;
const inputClass = "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const textareaClass = "min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-foreground";
const selectClass = "h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary";
const types: CouponType[] = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"];
const typeLabel: Record<CouponType, string> = { PERCENTAGE: "Percentual", FIXED_AMOUNT: "Valor fixo", FREE_SHIPPING: "Frete grátis" };

function discountLabel(coupon: CouponSummary) {
  if (coupon.type === "FREE_SHIPPING") return "Frete grátis";
  if (coupon.type === "PERCENTAGE") return `${coupon.discountValue ?? 0}% de desconto`;
  return `${formatCurrency(Number(coupon.discountValue ?? 0))} de desconto`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function validityRangeLabel(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "Sem data de validade";
  if (startsAt && !endsAt) return `${dateLabel(startsAt)} – Prazo indeterminado`;
  if (!startsAt && endsAt) return `Até ${dateLabel(endsAt)}`;
  return `${dateLabel(startsAt!)} – ${dateLabel(endsAt!)}`;
}

function localDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function TicketsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission("coupons:read") || hasPermission("coupons:manage");
  const canManage = hasPermission("coupons:manage");
  const [items, setItems] = useState<CouponSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [type, setType] = useState<CouponType | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<Coupon | "new" | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CouponSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadCoupons = useCallback(async () => {
    if (!canRead) return;
    setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (active) params.set("active", active);
    if (type) params.set("type", type);
    try {
      const response = await api.get<CouponPage>(`/api/coupons?${params}`);
      setItems(response.content ?? []); setTotalPages(response.totalPages ?? 0); setTotalElements(response.totalElements ?? 0);
    } catch (err) { setItems([]); setError(getApiErrorMessage(err, "Não foi possível carregar os cupons.")); }
    finally { setLoading(false); }
  }, [canRead, page, search, active, type]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCoupons();
  }, [loadCoupons, refresh]);

  async function editCoupon(id: string) {
    setActionId(id); setError(null);
    try { setEditor(await api.get<Coupon>(`/api/coupons/${id}`)); }
    catch (err) { setError(getApiErrorMessage(err, "Não foi possível abrir este cupom.")); }
    finally { setActionId(null); }
  }

  async function changeStatus(coupon: CouponSummary) {
    const nextActive = !coupon.active;
    setActionId(coupon.id); setError(null);
    try {
      await api.patch(`/api/coupons/${coupon.id}/status`, { active: nextActive });
      if (active && active !== String(nextActive)) {
        const nextTotal = Math.max(0, totalElements - 1);
        setItems((current) => current.filter((item) => item.id !== coupon.id));
        setTotalElements(nextTotal);
        setTotalPages(Math.ceil(nextTotal / PAGE_SIZE));
        if (page > 0 && items.length === 1) setPage(Math.max(0, page - 1));
      } else {
        setItems((current) => current.map((item) => item.id === coupon.id ? { ...item, active: nextActive } : item));
      }
    }
    catch (err) { setError(getApiErrorMessage(err, "Não foi possível alterar o status do cupom.")); }
    finally { setActionId(null); }
  }

  async function deleteCoupon() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError(null);
    try {
      await api.delete(`/api/coupons/${deleteTarget.id}`);
      setDeleteTarget(null); setRefresh((value) => value + 1);
    } catch (err) { setDeleteError(getApiErrorMessage(err, "Não foi possível excluir o cupom.")); }
    finally { setDeleting(false); }
  }

  const filtersActive = Boolean(searchInput.trim() || active || type);
  const clearFilters = () => { setSearchInput(""); setSearch(""); setActive(""); setType(""); setPage(0); };
  if (!canRead) return <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Você não tem permissão para consultar cupons.</div>;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><FontAwesomeIcon icon={faTag} /></span><div><h1 className="text-2xl font-bold tracking-tight">Cupons</h1><p className="mt-1 text-sm text-muted-foreground">Gerencie códigos, benefícios e limites de uso.</p></div></div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto"><span className="text-sm text-muted-foreground"><strong className="text-foreground">{totalElements}</strong> {totalElements === 1 ? "cupom" : "cupons"}</span>{canManage && <button type="button" onClick={() => setEditor("new")} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><FontAwesomeIcon icon={faPlus} /> Novo cupom</button>}</div>
    </header>

    <section aria-label="Filtros de cupons" className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Buscar e filtrar</h2>{filtersActive && <button type="button" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground"><FontAwesomeIcon icon={faXmark} /> Limpar filtros</button>}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="relative"><span className="mb-1 block text-xs text-muted-foreground">Código ou nome</span><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-[2.45rem] text-xs text-muted-foreground" /><input aria-label="Buscar cupons por código ou nome" placeholder="Ex.: BOASVINDAS10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className={`${inputClass} pl-9`} /></label>
        <label><span className="mb-1 block text-xs text-muted-foreground">Status</span><span className="relative block"><select aria-label="Filtrar cupons por status" value={active} onChange={(event) => { setActive(event.target.value); setPage(0); }} className={selectClass}><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select><FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3 top-3 text-xs" /></span></label>
        <label><span className="mb-1 block text-xs text-muted-foreground">Tipo</span><span className="relative block"><select aria-label="Filtrar cupons por tipo" value={type} onChange={(event) => { setType(event.target.value as CouponType | ""); setPage(0); }} className={selectClass}><option value="">Todos os tipos</option>{types.map((value) => <option key={value} value={value}>{typeLabel[value]}</option>)}</select><FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3 top-3 text-xs" /></span></label>
      </div>
    </section>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><span>{error}</span><button type="button" onClick={() => setRefresh((value) => value + 1)} className="rounded-md border border-current px-3 py-1.5"><FontAwesomeIcon icon={faRotate} /> Recarregar</button></div>}
    <section aria-label="Lista de cupons" className="overflow-hidden rounded-2xl border border-border bg-surface">
      {loading ? <div className="space-y-3 p-5" aria-label="Carregando cupons">{[1, 2, 3].map((key) => <Skeleton key={key} className="h-16 w-full" />)}</div> : items.length === 0 ? <div className="p-8 text-center"><EmptyState title={filtersActive ? "Nenhum cupom encontrado" : "Nenhum cupom cadastrado"} description={filtersActive ? "Ajuste os filtros ou limpe a busca." : "Crie um cupom para oferecer benefícios aos seus clientes."} />{filtersActive && <button type="button" onClick={clearFilters} className="mt-3 text-sm font-medium text-primary">Limpar filtros</button>}</div> : <><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Cupom</th><th className="px-4 py-3">Benefício</th><th className="px-4 py-3">Usos</th><th className="px-4 py-3">Validade</th><th className="px-4 py-3">Status</th>{canManage && <th className="px-4 py-3 text-right">Ações</th>}</tr></thead><tbody>{items.map((coupon) => { return <tr key={coupon.id} className="border-t border-border"><td className="px-4 py-3"><strong className="block font-semibold">{coupon.code}</strong><span className="text-xs text-muted-foreground">{coupon.name} · {typeLabel[coupon.type]}</span></td><td className="px-4 py-3">{discountLabel(coupon)}{coupon.minimumOrderValue != null && <span className="block text-xs text-muted-foreground">Mínimo {formatCurrency(Number(coupon.minimumOrderValue))}</span>}</td><td className="px-4 py-3">{coupon.usageCount}{coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : " · Sem limite"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{validityRangeLabel(coupon.startsAt, coupon.endsAt)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><ToggleSwitch checked={coupon.active} ariaLabel={`${coupon.active ? "Desativar" : "Ativar"} ${coupon.code}`} disabled={!canManage || actionId === coupon.id} onCheckedChange={() => void changeStatus(coupon)} /></div></td>{canManage && <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" title="Editar" aria-label={`Editar ${coupon.code}`} disabled={actionId === coupon.id} onClick={() => void editCoupon(coupon.id)} className="rounded-md p-2 hover:bg-surface-muted disabled:opacity-50"><FontAwesomeIcon icon={faEdit} /></button><button type="button" title="Excluir" aria-label={`Excluir ${coupon.code}`} disabled={actionId === coupon.id} onClick={() => { setDeleteError(null); setDeleteTarget(coupon); }} className="rounded-md p-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /></button></div></td>}</tr>; })}</tbody></table></div><footer className="flex items-center justify-between border-t border-border px-4 py-3 text-sm"><span className="text-muted-foreground">{totalElements} resultados</span><div className="flex items-center gap-2"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Anterior</button><span>Página {page + 1} de {Math.max(1, totalPages)}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Próxima</button></div></footer></>}
    </section>

    {editor && canManage && <CouponEditor coupon={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRefresh((value) => value + 1); }} />}
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Excluir cupom?"
      message={<>O cupom <strong className="text-foreground">{deleteTarget?.code}</strong> será removido da listagem. Esta ação não pode ser desfeita.</>}
      confirmLabel="Excluir cupom"
      destructive
      loading={deleting}
      error={deleteError}
      onConfirm={() => void deleteCoupon()}
      onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null); } }}
    />
  </div>;
}

function CouponEditor({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(coupon?.code ?? "");
  const [name, setName] = useState(coupon?.name ?? "");
  const [description, setDescription] = useState(coupon?.description ?? "");
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENTAGE");
  const [discount, setDiscount] = useState(coupon?.discountValue?.toString() ?? "");
  const [minimum, setMinimum] = useState(coupon?.minimumOrderValue?.toString() ?? "");
  const [usage, setUsage] = useState(coupon?.usageLimit?.toString() ?? "");
  const [perCustomer, setPerCustomer] = useState(coupon?.perCustomerLimit?.toString() ?? "");
  const [startsAt, setStartsAt] = useState(localDate(coupon?.startsAt));
  const [endsAt, setEndsAt] = useState(localDate(coupon?.endsAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setFieldError("");
    const discountValue = type === "FREE_SHIPPING" ? null : Number(discount);
    if (type !== "FREE_SHIPPING" && (discountValue === null || !Number.isFinite(discountValue) || discountValue <= 0 || (type === "PERCENTAGE" && discountValue > 100))) {
      setFieldError(type === "PERCENTAGE" ? "Informe um percentual entre 0 e 100." : "Informe um valor maior que zero."); return;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) { setFieldError("A data final deve ser posterior à inicial."); return; }
    const payload: CouponPayload = { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || null, type, discountValue, minimumOrderValue: minimum === "" ? null : Number(minimum), usageLimit: usage === "" ? null : Number(usage), perCustomerLimit: perCustomer === "" ? null : Number(perCustomer), startsAt: startsAt ? new Date(startsAt).toISOString() : null, endsAt: endsAt ? new Date(endsAt).toISOString() : null };
    setSaving(true);
    try { if (coupon) await api.put(`/api/coupons/${coupon.id}`, payload); else await api.post("/api/coupons", payload); onSaved(); }
    catch (err) { setError(getApiErrorMessage(err, "Não foi possível salvar o cupom.")); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="coupon-editor-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-5">
        <div><h2 id="coupon-editor-title" className="text-xl font-semibold">{coupon ? "Editar cupom" : "Novo cupom"}</h2><p className="mt-1 text-sm text-muted-foreground">Preencha as informações e defina as regras de uso.</p></div>
        <button type="button" aria-label="Fechar" disabled={saving} onClick={onClose} className="rounded-md p-2 hover:bg-surface-muted"><FontAwesomeIcon icon={faXmark} /></button>
      </header>
      <form onSubmit={(event) => void submit(event)} className="space-y-6 p-5 sm:p-7">
        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

        <section className="space-y-4">
          <div><h3 className="text-sm font-semibold text-foreground">Informações do cupom</h3><p className="mt-1 text-xs text-muted-foreground">Identifique o código que seus clientes vão usar.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Código</span><input required maxLength={60} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className={inputClass} placeholder="BOASVINDAS10" /></label>
            <label><span className={labelClass}>Nome</span><input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
          </div>
          <label className="block"><span className={labelClass}>Descrição <span className="font-normal text-muted-foreground">(opcional)</span></span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} /></label>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <div><h3 className="text-sm font-semibold text-foreground">Benefício e limites</h3><p className="mt-1 text-xs text-muted-foreground">Escolha o desconto e, se quiser, limite onde e quantas vezes será usado.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Tipo de benefício</span><span className="relative block"><select value={type} onChange={(event) => setType(event.target.value as CouponType)} className={selectClass}>{types.map((value) => <option key={value} value={value}>{typeLabel[value]}</option>)}</select><FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3 top-3 text-xs" /></span></label>
            {type !== "FREE_SHIPPING" && <label><span className={labelClass}>{type === "PERCENTAGE" ? "Desconto (%)" : "Desconto (R$)"}</span><input required type="number" min="0.01" max={type === "PERCENTAGE" ? 100 : undefined} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className={inputClass} />{fieldError && <span className="mt-1 block text-xs text-destructive">{fieldError}</span>}</label>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label><span className={labelClass}>Pedido mínimo (R$) <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="number" min="0" step="0.01" value={minimum} onChange={(event) => setMinimum(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Limite total <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="number" min="1" step="1" value={usage} onChange={(event) => setUsage(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Limite por cliente <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="number" min="1" step="1" value={perCustomer} onChange={(event) => setPerCustomer(event.target.value)} className={inputClass} /></label>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <div><h3 className="text-sm font-semibold text-foreground">Período de validade</h3><p className="mt-1 text-xs text-muted-foreground">Deixe em branco para não definir uma data.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Início <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Fim <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputClass} />{fieldError && startsAt && endsAt && <span className="mt-1 block text-xs text-destructive">{fieldError}</span>}</label>
          </div>
        </section>

        <footer className="flex justify-end gap-2 border-t border-border pt-5">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Salvando…" : "Salvar cupom"}</button>
        </footer>
      </form>
    </section>
  </div>;
}
