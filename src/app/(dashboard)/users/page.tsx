"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faPlus, faRotate, faSearch, faTrash, faUsers } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import type { CreateUserRequest, UpdateUserRequest, User, UserDetails, UserPageResponse, UserRole } from "@/lib/types/user";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/products/ConfirmDialog";

const PAGE_SIZE = 10;
type ActiveFilter = "" | "true" | "false";
type Confirmation = { user: User; action: "activate" | "deactivate" | "delete" } | null;

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission("users:read") || hasPermission("users:manage");
  const canManage = hasPermission("users:manage");
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formTarget, setFormTarget] = useState<UserDetails | null | undefined>(undefined);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    if (!canRead) { setLoading(false); return; }
    setLoading(true);
    setListError(null);
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (active) params.set("active", active);
    try {
      const result = await api.get<UserPageResponse>(`/api/users?${params.toString()}`);
      setUsers(result.content ?? []);
      setTotalElements(result.totalElements ?? 0);
      setTotalPages(result.totalPages ?? 0);
    } catch (error) {
      setUsers([]); setTotalElements(0); setTotalPages(0);
      setListError(getApiErrorMessage(error, "Não foi possível carregar os usuários."));
    } finally { setLoading(false); }
  }, [active, canRead, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers, refreshKey]);

  async function openEdit(user: User) {
    setNotice(null);
    try {
      const detail = await api.get<UserDetails>(`/api/users/${user.id}`);
      setFormTarget(detail);
    } catch (error) {
      setNotice(getApiErrorMessage(error, "Não foi possível carregar os dados deste usuário."));
    }
  }

  async function handleConfirm() {
    if (!confirmation) return;
    setMutating(true); setConfirmError(null);
    try {
      if (confirmation.action === "delete") {
        await api.delete(`/api/users/${confirmation.user.id}`);
        setNotice("Usuário removido.");
        if (users.length === 1 && page > 0) setPage((value) => Math.max(0, value - 1));
      } else {
        await api.patch(`/api/users/${confirmation.user.id}/status`, { active: confirmation.action === "activate" });
        setNotice(`Usuário ${confirmation.action === "activate" ? "ativado" : "desativado"}.`);
      }
      setConfirmation(null); setRefreshKey((value) => value + 1);
    } catch (error) {
      setConfirmError(getApiErrorMessage(error, "Não foi possível concluir a operação."));
    } finally { setMutating(false); }
  }

  if (!canRead) {
    return <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-sm">Você não tem permissão para visualizar usuários.</div>;
  }

  const hasFilters = Boolean(searchInput || active);
  const confirmTitle = confirmation?.action === "delete" ? "Remover usuário?" : `${confirmation?.action === "activate" ? "Ativar" : "Desativar"} usuário?`;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Usuários</h1><p className="text-muted-foreground">Gerencie os usuários deste mercado.</p></div>
      {canManage && <button type="button" onClick={() => { setNotice(null); setFormTarget(null); }} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><FontAwesomeIcon icon={faPlus} /> Novo usuário</button>}
    </header>
    {notice && <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm">{notice}</p>}
    <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => event.preventDefault()}>
      <div className="relative min-w-[220px] max-w-md flex-1"><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-muted-foreground" /><input type="search" aria-label="Buscar por nome ou e-mail" placeholder="Buscar por nome ou e-mail..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" /></div>
      <select aria-label="Filtrar situação" value={active} onChange={(event) => { setActive(event.target.value as ActiveFilter); setPage(0); }} className="rounded-lg border border-border bg-surface px-4 py-2 text-foreground"><option value="">Todas as situações</option><option value="true">Ativos</option><option value="false">Inativos</option></select>
      {hasFilters && <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setActive(""); setPage(0); }} className="px-3 py-2 text-sm text-muted-foreground">Limpar filtros</button>}
    </form>
    {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} height="3rem" radius="0.5rem" />)}</div> : listError ? <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 p-8 text-center"><p className="font-medium text-destructive">{listError}</p><button type="button" onClick={() => void loadUsers()} className="rounded-lg border border-border px-4 py-2 text-sm"><FontAwesomeIcon icon={faRotate} /> Tentar novamente</button></div> : users.length === 0 ? <EmptyState icon={faUsers} title={hasFilters ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"} description={hasFilters ? "Ajuste os filtros ou limpe a busca." : "Cadastre usuários para conceder acesso ao mercado."} action={canManage && !hasFilters ? <button type="button" onClick={() => setFormTarget(null)} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"><FontAwesomeIcon icon={faPlus} /> Novo usuário</button> : undefined} /> : <>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="px-4 py-3">Nome</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Roles</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Criado em</th>{canManage && <th className="px-4 py-3 text-right">Ações</th>}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium">{user.name}</td><td className="px-4 py-3">{user.email}</td><td className="px-4 py-3">{user.roles?.map((role) => <Badge key={role.id} className="mr-1">{role.name}</Badge>)}</td><td className="px-4 py-3"><Badge variant={user.active ? "positive" : "negative"}>{user.active ? "Ativo" : "Inativo"}</Badge></td><td className="px-4 py-3">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "—"}</td>{canManage && <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" aria-label={`Editar ${user.name}`} onClick={() => void openEdit(user)} className="rounded-md p-2 text-muted-foreground hover:bg-surface-muted"><FontAwesomeIcon icon={faEdit} /></button><button type="button" onClick={() => { setConfirmError(null); setConfirmation({ user, action: user.active ? "deactivate" : "activate" }); }} className="rounded-md border border-border px-2 py-1 text-xs">{user.active ? "Desativar" : "Ativar"}</button><button type="button" aria-label={`Remover ${user.name}`} onClick={() => { setConfirmError(null); setConfirmation({ user, action: "delete" }); }} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><FontAwesomeIcon icon={faTrash} /></button></div></td>}</tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{totalElements} usuário(s)</span><div className="flex items-center gap-3"><span>Página {totalPages ? page + 1 : 0} de {Math.max(totalPages, 1)}</span><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-border px-3 py-1.5 text-foreground disabled:opacity-40">Anterior</button><button type="button" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-1.5 text-foreground disabled:opacity-40">Próxima</button></div></div>
    </>}
    {formTarget !== undefined && canManage && <UserForm key={formTarget?.id ?? "new-user"} user={formTarget} onClose={() => setFormTarget(undefined)} onSaved={(message) => { setFormTarget(undefined); setNotice(message); if (!formTarget) setPage(0); setRefreshKey((value) => value + 1); }} />}
    <ConfirmDialog open={Boolean(confirmation)} title={confirmTitle} message={confirmation?.action === "delete" ? <>A remoção de <strong>{confirmation?.user.name}</strong> será processada pelo Core API.</> : <>Confirma {confirmation?.action === "activate" ? "a ativação" : "a desativação"} de <strong>{confirmation?.user.name}</strong>?</>} confirmLabel={confirmation?.action === "delete" ? "Remover" : "Confirmar"} destructive={confirmation?.action === "delete" || confirmation?.action === "deactivate"} loading={mutating} error={confirmError} onConfirm={() => void handleConfirm()} onCancel={() => { if (!mutating) setConfirmation(null); }} />
  </div>;
}

function UserForm({ user, onClose, onSaved }: { user: UserDetails | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((role) => role.id) ?? []);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true); setRolesError(null);
    try {
      const response = await api.get<UserRole[] | { roles: UserRole[] }>("/api/roles");
      setRoles(Array.isArray(response) ? response : response.roles ?? []);
    } catch (err) { setRolesError(getApiErrorMessage(err, "Não foi possível carregar as roles.")); }
    finally { setRolesLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRoles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRoles]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Informe o nome.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Informe um e-mail válido.";
    if (!user && password.length < 8) errors.password = "A senha deve ter pelo menos 8 caracteres.";
    if (roleIds.length === 0) errors.roleIds = "Selecione ao menos uma role.";
    setFieldErrors(errors); setError(null);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      if (user) {
        const payload: UpdateUserRequest = {};
        if (name.trim() !== user.name) payload.name = name.trim();
        if (email.trim() !== user.email) payload.email = email.trim();
        const oldRoleIds = user.roles.map((role) => role.id).sort();
        if (roleIds.slice().sort().join(",") !== oldRoleIds.join(",")) payload.roleIds = roleIds;
        if (Object.keys(payload).length) await api.patch(`/api/users/${user.id}`, payload);
      } else {
        const payload: CreateUserRequest = { name: name.trim(), email: email.trim(), password, roleIds };
        await api.post("/api/users", payload);
      }
      onSaved(user ? "Usuário atualizado." : "Usuário criado com sucesso.");
    } catch (err) { setError(getApiErrorMessage(err, "Não foi possível salvar o usuário.")); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onKeyDown={(event) => { if (event.key === "Escape" && !saving) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl"><h2 id="user-form-title" className="text-xl font-semibold">{user ? "Editar usuário" : "Novo usuário"}</h2><form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4" noValidate>
    <div><label className="block text-sm" htmlFor="user-name">Nome</label><input id="user-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />{fieldErrors.name && <span className="text-xs text-destructive">{fieldErrors.name}</span>}</div>
    <div><label className="block text-sm" htmlFor="user-email">E-mail</label><input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />{fieldErrors.email && <span className="text-xs text-destructive">{fieldErrors.email}</span>}</div>
    {!user && <div><label className="block text-sm" htmlFor="user-password">Senha</label><input id="user-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />{fieldErrors.password && <span className="text-xs text-destructive">{fieldErrors.password}</span>}</div>}
    <fieldset><legend className="mb-2 text-sm font-medium">Roles</legend>{rolesLoading ? <p className="text-sm text-muted-foreground">Carregando roles…</p> : rolesError ? <div role="alert" className="text-sm text-destructive">{rolesError} <button type="button" onClick={() => void loadRoles()} className="underline">Tentar novamente</button></div> : roles.length === 0 ? <p className="text-sm text-muted-foreground">Não há roles disponíveis.</p> : <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">{roles.map((role) => <label key={role.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roleIds.includes(role.id)} onChange={(event) => setRoleIds((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id))} />{role.name}</label>)}</div>}{fieldErrors.roleIds && <span className="text-xs text-destructive">{fieldErrors.roleIds}</span>}</fieldset>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving || rolesLoading || Boolean(rolesError) || roles.length === 0} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button></div>
  </form></section></div>;
}
