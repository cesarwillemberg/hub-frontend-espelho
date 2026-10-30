"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  faStore,
  faMagnifyingGlass,
  faCircleNotch,
  faSignOutAlt,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useAuth } from "@/lib/auth/auth-context";
import type { UserTenantSummary } from "@/lib/types/auth";
import { formatDocumentNumber } from "@/lib/formatters";
import { AppControls } from "@/components/shared/AppControls";
import styles from "./selecionar-mercado.module.css";

export default function SelecionarMercadoPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    selectTenant,
    switchTenant,
    listMyTenants,
    tenant: currentTenant,
    pendingSelection,
    setPendingSelection,
    loading: authLoading,
    logout,
  } = useAuth();

  const [tenants, setTenants] = useState<UserTenantSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectingTenantId, setSelectingTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const filteredTenants = tenants.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.marketName.toLowerCase().includes(q) ||
      t.tenantSlug.toLowerCase().includes(q)
    );
  });

  const showSearch = tenants.length > 3;

  const isTenantActive = (tenant: UserTenantSummary) => {
    if (tenant.activeTenant) return true;
    if (!currentTenant) return false;
    return currentTenant.id === tenant.id;
  };

  const loadTenants = useCallback(async () => {
    try {
      if (pendingSelection?.tenants?.length) {
        // Cenário 1: seleção pós-login com selectionToken
        setTenants(pendingSelection.tenants);
      } else {
        // Cenário 2: usuário já autenticado
        const data = await listMyTenants();
        setTenants(data);
      }
    } catch (err: any) {
      setError(
        err.data?.message ?? err.message ?? t("selectMarket.noMarkets"),
      );
    } finally {
      setInitialized(true);
    }
  }, [pendingSelection, listMyTenants, t]);

  useEffect(() => {
    if (!authLoading) {
      loadTenants();
    }
  }, [authLoading, loadTenants]);

  const handleSelectTenant = useCallback(
    async (tenant: UserTenantSummary) => {
      if (selectingTenantId) return;
      setSelectingTenantId(tenant.id);
      setError(null);

      try {
        if (pendingSelection?.selectionToken) {
          // Cenário 1: seleção pós-login com selectionToken
          await selectTenant(pendingSelection.selectionToken, tenant.id);
          setPendingSelection(null);
        } else if (isTenantActive(tenant)) {
          // Já é o mercado ativo: apenas navega para o dashboard
          router.push("/dashboard");
          return;
        } else {
          // Cenário 2: troca de mercado a quente
          await switchTenant(tenant.id);
        }
        router.push("/dashboard");
      } catch (err: any) {
        setError(
          err.data?.message ?? err.message ?? "Erro ao selecionar o mercado.",
        );
      } finally {
        setSelectingTenantId(null);
      }
    },
    [pendingSelection, selectTenant, switchTenant, router, isTenantActive, setPendingSelection],
  );

  const handleLogout = () => {
    // Limpa a seleção pendente (estado + sessionStorage) antes de encerrar a sessão
    setPendingSelection(null);
    // Encerra a sessão de verdade: invalida o refresh token via API,
    // limpa os tokens do localStorage e redireciona para /login.
    void logout();
  };

  if (authLoading || (!initialized && !pendingSelection)) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <FontAwesomeIcon
            icon={faCircleNotch}
            className="w-8 h-8 animate-spin text-primary"
          />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <FontAwesomeIcon icon={faStore} aria-hidden="true" />
            <span>Marvi Hub</span>
          </div>
          <h1>{t("selectMarket.title")}</h1>
          <p>{t("selectMarket.subtitle")}</p>
          <div className={styles.controls}>
            <AppControls />
          </div>
        </div>

        {showSearch && (
          <div className={styles.search}>
            <div className={styles.searchField}>
              <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
              <input
                type="text"
                placeholder={t("selectMarket.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <div className={styles.list}>
          {filteredTenants.length === 0 ? (
            <div className={styles.empty}>
              <FontAwesomeIcon icon={faStore} aria-hidden="true" />
              <h3>{t("selectMarket.noMarkets")}</h3>
            </div>
          ) : (
            filteredTenants.map((tenant) => (
              <div
                key={tenant.id}
                className={`${styles.tenantCard} ${
                  isTenantActive(tenant) ? styles.active : ""
                } ${selectingTenantId === tenant.id ? styles.loading : ""}`}
                onClick={() => handleSelectTenant(tenant)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectTenant(tenant);
                  }
                }}
              >
                <div className={styles.iconWrapper}>
                  <FontAwesomeIcon icon={faStore} aria-hidden="true" />
                </div>
                <div className={styles.details}>
                  <span className={styles.name}>{tenant.marketName}</span>
                  <div className={styles.meta}>
                    <span>{tenant.tenantSlug}</span>
                    <span className={styles.separator}>·</span>
                    <span>{formatDocumentNumber(tenant.documentNumber)}</span>
                  </div>
                </div>
                {isTenantActive(tenant) && (
                  <span className={styles.badgeActive}>{t("selectMarket.currentBadge")}</span>
                )}
                {selectingTenantId === tenant.id && (
                  <div className={styles.spinner} aria-hidden="true" />
                )}
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="ml-auto text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            aria-label={t("selectMarket.switchAccount")}
          >
            <FontAwesomeIcon icon={faSignOutAlt} aria-hidden="true" />
            <span>{t("selectMarket.switchAccount")}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          role="alert"
        >
          <div
            className="flex items-center gap-10 px-4 py-3 border border-border rounded-lg bg-red-50 text-red-700 text-sm font-medium"
          >
            <FontAwesomeIcon icon={faCircleNotch} className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </main>
  );
}
