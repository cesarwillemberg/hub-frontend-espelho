"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faPlus, faRotate, faSearch, faTag, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api/client";
import { getApiErrorMessage, getFieldErrors } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import type { CatalogCategory, Category, CategoryRequest, PageResponse } from "@/lib/types/product";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConfirmDialog } from "@/components/products/ConfirmDialog";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
type ActiveFilter = "" | "true" | "false";

export default function CategoriesPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission("products:read");
  const canCreate = hasPermission("products:create");
  const canUpdate = hasPermission("products:update");
  const canDelete = hasPermission("products:delete");
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [canonicalCategories, setCanonicalCategories] = useState<CatalogCategory[]>([]);
  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const [canonicalError, setCanonicalError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<Category | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCategories = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError(null);
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (active) params.set("active", active);
    try {
      const result = await api.get<PageResponse<Category>>(`/api/categories?${params.toString()}`);
      setCategories(result.content ?? []);
      setTotalElements(result.totalElements ?? 0);
      setTotalPages(result.totalPages ?? 0);
    } catch (error) {
      setCategories([]);
      setTotalElements(0);
      setTotalPages(0);
      setListError(getApiErrorMessage(error, "Não foi possível carregar as categorias."));
    } finally {
      setLoading(false);
    }
  }, [active, canRead, page, search]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories, refreshKey]);

  const loadCanonicalCategories = useCallback(async () => {
    setCanonicalLoading(true);
    setCanonicalError(null);
    try {
      const response = await api.get<CatalogCategory[] | { content?: CatalogCategory[] }>("/api/catalog-categories");
      const options = Array.isArray(response) ? response : response?.content ?? [];
      setCanonicalCategories(options);
    } catch (error) {
      setCanonicalCategories([]);
      setCanonicalError(getApiErrorMessage(error, "Não foi possível carregar as categorias canônicas."));
    } finally {
      setCanonicalLoading(false);
    }
  }, []);

  const openForm = useCallback((category: Category | null) => {
    setFormTarget(category);
    void loadCanonicalCategories();
  }, [loadCanonicalCategories]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/categories/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (categories.length === 1 && page > 0) setPage((value) => Math.max(0, value - 1));
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "Não foi possível desativar a categoria."));
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(category: Category) {
    if (!canUpdate || updatingStatusId) return;

    setUpdatingStatusId(category.id);
    setStatusErrors((current) => {
      const next = { ...current };
      delete next[category.id];
      return next;
    });

    const payload: CategoryRequest = {
      name: category.name,
      description: category.description,
      canonicalKey: category.canonicalCategory?.key ?? null,
      active: !category.active,
    };

    try {
      await api.put(`/api/categories/${category.id}`, payload);
      if (active && categories.length === 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      }
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setStatusErrors((current) => ({
        ...current,
        [category.id]: getApiErrorMessage(error, "Não foi possível atualizar a situação da categoria."),
      }));
    } finally {
      setUpdatingStatusId(null);
    }
  }

  if (!canRead) {
    return <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-sm">Você não tem permissão para visualizar categorias.</div>;
  }

  const hasFilters = Boolean(searchInput || active);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">Organize as categorias do catálogo da sua loja.</p>
        </div>
        {canCreate && <button type="button" onClick={() => openForm(null)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><FontAwesomeIcon icon={faPlus} /> Nova categoria</button>}
      </header>

      <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => event.preventDefault()}>
        <div className="relative min-w-[220px] max-w-md flex-1">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-muted-foreground" />
          <input type="search" aria-label="Buscar categorias por nome" placeholder="Buscar por nome..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select aria-label="Filtrar situação" value={active} onChange={(event) => { setActive(event.target.value as ActiveFilter); setPage(0); }} className="rounded-lg border border-border bg-surface px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">Todas as situações</option><option value="true">Ativas</option><option value="false">Inativas</option>
        </select>
        {hasFilters && <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setActive(""); setPage(0); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Limpar filtros</button>}
      </form>

      {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} height="3rem" radius="0.5rem" />)}</div> : listError ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-medium text-destructive">{listError}</p><button type="button" onClick={() => void fetchCategories()} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-muted"><FontAwesomeIcon icon={faRotate} /> Tentar novamente</button></div>
      ) : categories.length === 0 ? (
        <EmptyState icon={faTag} title="Nenhuma categoria encontrada" description={hasFilters ? "Ajuste os filtros ou limpe a busca." : "Cadastre uma categoria para organizar os produtos da sua loja."} action={canCreate && !hasFilters ? <button type="button" onClick={() => openForm(null)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><FontAwesomeIcon icon={faPlus} /> Nova categoria</button> : undefined} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Categoria canônica</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
              <tbody>{categories.map((category) => <tr key={category.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50"><td className="px-4 py-3 font-medium">{category.name}</td><td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{category.description || "—"}</td><td className="px-4 py-3">{category.canonicalCategory ? <span>{category.canonicalCategory.name} <Badge variant={category.canonicalCategory.active === false ? "negative" : "positive"}>{category.canonicalCategory.active === false ? "Inativa" : "Ativa"}</Badge></span> : <span className="text-muted-foreground">—</span>}</td><td className="px-4 py-3"><ToggleSwitch checked={category.active} ariaLabel={`${category.active ? "Desativar" : "Ativar"} ${category.name}`} ariaDescribedBy={statusErrors[category.id] ? `category-status-error-${category.id}` : undefined} disabled={!canUpdate || updatingStatusId !== null} onCheckedChange={() => void handleToggleActive(category)} />{statusErrors[category.id] && <p id={`category-status-error-${category.id}`} role="alert" className="mt-1 max-w-36 text-xs text-destructive">{statusErrors[category.id]}</p>}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{canUpdate && <button type="button" aria-label={`Editar ${category.name}`} onClick={() => openForm(category)} className="rounded-md p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground"><FontAwesomeIcon icon={faEdit} /></button>}{canDelete && category.active && <button type="button" aria-label={`Desativar ${category.name}`} onClick={() => { setDeleteError(null); setDeleteTarget(category); }} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><FontAwesomeIcon icon={faTrash} /></button>}</div></td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{totalElements} categoria(s)</span><div className="flex items-center gap-3"><span>Página {totalPages ? page + 1 : 0} de {Math.max(totalPages, 1)}</span><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-border px-3 py-1.5 text-foreground disabled:opacity-40">Anterior</button><button type="button" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-1.5 text-foreground disabled:opacity-40">Próxima</button></div></div>
        </>
      )}

      {formTarget !== undefined && <CategoryFormModal category={formTarget} canonicalCategories={canonicalCategories} canonicalLoading={canonicalLoading} canonicalError={canonicalError} onRetryCanonical={loadCanonicalCategories} canUpdate={canUpdate} onClose={() => setFormTarget(undefined)} onSaved={() => { if (formTarget === null) setPage(0); setFormTarget(undefined); setRefreshKey((value) => value + 1); }} />}
      <ConfirmDialog open={Boolean(deleteTarget)} title="Desativar categoria?" message={<><span>A categoria <strong>{deleteTarget?.name}</strong> será excluída logicamente e ficará inativa. Esta ação não pode ser revertida pela tela.</span></>} confirmLabel="Desativar categoria" destructive loading={deleting} error={deleteError} onConfirm={() => void handleDelete()} onCancel={() => { if (!deleting) setDeleteTarget(null); }} />
    </div>
  );
}

function CategoryFormModal({ category, canonicalCategories, canonicalLoading, canonicalError, onRetryCanonical, canUpdate, onClose, onSaved }: { category: Category | null; canonicalCategories: CatalogCategory[]; canonicalLoading: boolean; canonicalError: string | null; onRetryCanonical: () => Promise<void>; canUpdate: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [canonicalKey, setCanonicalKey] = useState(category?.canonicalCategory?.key ?? "");
  const [active, setActive] = useState(category?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Informe o nome da categoria.";
    if (name.trim().length > 120) errors.name = "O nome deve ter no máximo 120 caracteres.";
    if (canonicalKey.length > 80) errors.canonicalKey = "A chave deve ter no máximo 80 caracteres.";
    if (canonicalCategories.some((option) => option.key === canonicalKey && !option.active)) {
      errors.canonicalKey = "Selecione uma categoria canônica ativa ou remova o vínculo.";
    }
    setFieldErrors(errors);
    setBanner(null);
    if (Object.keys(errors).length) return;
    setSaving(true);
    const payload: CategoryRequest = { name: name.trim(), description: description.trim() || null, canonicalKey: canonicalKey || null, active };
    try {
      if (category) await api.put(`/api/categories/${category.id}`, payload);
      else await api.post("/api/categories", payload);
      onSaved();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const apiFields = getFieldErrors(error);
      if (Object.keys(apiFields).length) setFieldErrors(Object.fromEntries(Object.entries(apiFields).map(([key, value]) => [key.toLowerCase().replaceAll("_", "") === "canonicalkey" ? "canonicalKey" : key, value])));
      if (status === 409) setBanner("Já existe uma categoria com esse nome.");
      else if (status === 404 && canonicalKey) setBanner("A categoria canônica selecionada não existe ou está inativa.");
      else setBanner(getApiErrorMessage(error, "Não foi possível salvar a categoria."));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
  const errorClass = "mt-1 text-sm text-destructive";
  const selectedCanonical = canonicalCategories.find((option) => option.key === canonicalKey);
  const hasInactiveCanonical = selectedCanonical?.active === false || category?.canonicalCategory?.active === false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faTag} className="h-4 w-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 id="category-form-title" className="text-lg font-semibold tracking-tight text-foreground">
                {category ? "Editar categoria" : "Nova categoria"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Defina como esta categoria aparece no catálogo da sua loja.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar modal"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="space-y-5 px-6 py-6 sm:px-7">
            {banner && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {banner}
              </p>
            )}

            <div>
              <label htmlFor="category-name" className="text-sm font-medium text-foreground">
                Nome <span className="text-destructive">*</span>
              </label>
              <input
                autoFocus
                id="category-name"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "category-name-error" : undefined}
                className={`${inputClass} mt-2 rounded-xl bg-surface-muted/30 px-3.5 py-2.5 transition-colors`}
                placeholder="Ex.: Açougue"
                required
              />
              <div className="mt-1 flex justify-between gap-3">
                {fieldErrors.name ? (
                  <p id="category-name-error" className={errorClass}>{fieldErrors.name}</p>
                ) : <span className="text-xs text-muted-foreground">Até 120 caracteres.</span>}
                <span className="shrink-0 text-xs text-muted-foreground">{name.length}/120</span>
              </div>
            </div>

            <div>
              <label htmlFor="category-description" className="text-sm font-medium text-foreground">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id="category-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${inputClass} mt-2 resize-y rounded-xl bg-surface-muted/30 px-3.5 py-2.5 transition-colors`}
                placeholder="Adicione uma breve descrição para esta categoria."
              />
            </div>

            <div>
              <label htmlFor="category-canonical" className="text-sm font-medium text-foreground">
                Categoria canônica <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <select
                id="category-canonical"
                value={canonicalKey}
                onChange={(event) => setCanonicalKey(event.target.value)}
                aria-invalid={Boolean(fieldErrors.canonicalKey)}
                aria-describedby={fieldErrors.canonicalKey ? "category-canonical-error" : undefined}
                disabled={canonicalLoading || Boolean(canonicalError)}
                className={`${inputClass} mt-2 rounded-xl bg-surface-muted/30 px-3.5 py-2.5 transition-colors`}
              >
                {canonicalLoading ? <option value="">Carregando categorias…</option> : canonicalError ? <option value="">Categorias indisponíveis</option> : <option value="">Sem vínculo</option>}
                {canonicalCategories.map((option) => (
                  <option key={option.id} value={option.key} disabled={!option.active}>
                    {option.name}{option.active ? "" : " (inativa)"}
                  </option>
                ))}
              </select>
              {fieldErrors.canonicalKey ? (
                <p id="category-canonical-error" className={errorClass}>{fieldErrors.canonicalKey}</p>
              ) : canonicalError ? (
                <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <span>{canonicalError}</span>
                  <button type="button" onClick={() => void onRetryCanonical()} className="shrink-0 font-semibold underline underline-offset-2">
                    Tentar novamente
                  </button>
                </div>
              ) : canonicalLoading ? (
                <p className="mt-1.5 text-xs text-muted-foreground">Carregando opções canônicas…</p>
              ) : canonicalCategories.length === 0 ? (
                <p className="mt-1.5 text-xs text-warning">A API não retornou categorias canônicas.</p>
              ) : hasInactiveCanonical ? (
                <p className="mt-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs leading-relaxed text-warning">
                  Este vínculo está inativo. Escolha uma categoria ativa ou “Sem vínculo” antes de salvar.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Relacione esta categoria a uma seção padrão do catálogo.
                </p>
              )}
            </div>

            {category && canUpdate && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Categoria ativa</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {active ? "Visível no catálogo." : "Inativa e oculta do catálogo."}
                  </p>
                </div>
                <ToggleSwitch checked={active} onCheckedChange={setActive} ariaLabel="Categoria ativa" />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface-muted/10 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || (category !== null && !canUpdate)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando…" : category ? "Salvar alterações" : "Criar categoria"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
