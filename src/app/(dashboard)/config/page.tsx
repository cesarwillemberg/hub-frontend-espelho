"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  faArrowLeft,
  faCheck,
  faChevronDown,
  faGear,
  faMoon,
  faSun,
  faDesktop,
  faSliders,
  faUser,
  faEnvelope,
  faIdCard,
  faStore,
  faCalendarDays,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import i18n, { defaultLanguage } from "@/lib/i18n/config";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

const LANGUAGE_STORAGE_KEY = "marvi-hub-language";
const APPEARANCE_STORAGE_KEY = "marvi-hub-appearance";
const languages = [
  { value: "auto", labelKey: "settings.language.auto" },
  { value: "pt-BR", labelKey: "settings.language.portuguese" },
  { value: "en", labelKey: "settings.language.english" },
  { value: "es", labelKey: "settings.language.spanish" },
] as const;

const accents = [
  { label: "Vermelho", value: "#ff302c" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Violeta", value: "#8b5cf6" },
  { label: "Verde", value: "#16a36a" },
  { label: "Laranja", value: "#f97316" },
  { label: "Rosa", value: "#e64980" },
];

type AppearancePreferences = {
  accent: string;
  background: string;
  foreground: string;
  fontSize: number;
  codeFontSize: number;
  reduceMotion: boolean;
  contrast: number;
};

type AccountProfile = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  active?: boolean;
  roles?: Array<{ id: string; name: string }>;
  createdAt?: string | null;
};

const DEFAULT_APPEARANCE: AppearancePreferences = {
  accent: "#ff302c",
  background: "",
  foreground: "",
  fontSize: 16,
  codeFontSize: 13,
  reduceMotion: false,
  contrast: 60,
};

function detectLanguage() {
  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("en")) return "en";
  if (browserLanguage.startsWith("es")) return "es";
  return defaultLanguage;
}

function isHexColor(value: string) {
  return /^#[\da-f]{6}$/i.test(value);
}

export default function ConfigPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, tenant } = useAuth();
  const [section, setSection] = useState<"general" | "appearance" | "account">("general");
  const [languagePreference, setLanguagePreference] = useState<string>("auto");
  const [appearance, setAppearance] = useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const [accountReload, setAccountReload] = useState(0);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguagePreference(savedLanguage ?? "auto");
    try {
      const savedAppearance = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
      if (savedAppearance) {
        const parsed = JSON.parse(savedAppearance) as Partial<AppearancePreferences>;
        setAppearance({ ...DEFAULT_APPEARANCE, ...parsed });
      }
    } catch {
      window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    }
    setAppearanceLoaded(true);
  }, []);

  useEffect(() => {
    if (section !== "account") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountLoading(true);
    setAccountError(false);
    void api.get<AccountProfile>("/api/users/me")
      .then((profile) => {
        if (!cancelled) setAccountProfile(profile);
      })
      .catch(() => {
        if (!cancelled) setAccountError(true);
      })
      .finally(() => {
        if (!cancelled) setAccountLoading(false);
      });
    return () => { cancelled = true; };
  }, [section, user?.id, accountReload]);

  useEffect(() => {
    if (!appearanceLoaded) return;
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    const root = document.documentElement;
    root.style.setProperty("--primary", appearance.accent);
    root.style.setProperty("--mh-ui-font-size", `${appearance.fontSize}px`);
    root.style.setProperty("--mh-code-font-size", `${appearance.codeFontSize}px`);
    root.style.setProperty("--mh-contrast", String(appearance.contrast / 100));
    root.style.setProperty("--mh-border-contrast", `${Math.round(appearance.contrast * 0.28)}%`);
    root.style.setProperty("--border", `color-mix(in srgb, var(--foreground) ${Math.round(appearance.contrast * 0.28)}%, var(--surface))`);
    root.style.fontSize = `${appearance.fontSize}px`;
    root.classList.toggle("mh-reduce-motion", appearance.reduceMotion);
    if (isHexColor(appearance.background)) root.style.setProperty("--background", appearance.background);
    else root.style.removeProperty("--background");
    if (isHexColor(appearance.foreground)) root.style.setProperty("--foreground", appearance.foreground);
    else root.style.removeProperty("--foreground");
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--mh-ui-font-size");
      root.style.removeProperty("--mh-code-font-size");
      root.style.removeProperty("--mh-contrast");
      root.style.removeProperty("--mh-border-contrast");
      root.style.removeProperty("--border");
      root.style.removeProperty("font-size");
      root.classList.remove("mh-reduce-motion");
      root.style.removeProperty("--background");
      root.style.removeProperty("--foreground");
    };
  }, [appearance, appearanceLoaded]);

  function handleLanguageChange(value: string) {
    setLanguagePreference(value);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    void i18n.changeLanguage(value === "auto" ? detectLanguage() : value);
  }

  function updateAppearance<K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) {
    setAppearance((current) => ({ ...current, [key]: value }));
  }

  const activeTheme = theme ?? "system";
  const modes = [
    { id: "system", label: "Sistema", icon: faDesktop },
    { id: "light", label: "Claro", icon: faSun },
    { id: "dark", label: "Escuro", icon: faMoon },
  ] as const;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background sm:flex">
        <Link href="/dashboard" className="flex min-h-16 items-center gap-2 px-5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
          {t("settings.backToApp")}
        </Link>
        <div className="px-3 pt-3">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.personal")}</p>
          <button type="button" onClick={() => setSection("general")} aria-current={section === "general" ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${section === "general" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}>
            <FontAwesomeIcon icon={faGear} className="h-4 w-4" />{t("settings.general")}
          </button>
          <button type="button" onClick={() => setSection("appearance")} aria-current={section === "appearance" ? "page" : undefined}
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${section === "appearance" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}>
            <FontAwesomeIcon icon={faSliders} className="h-4 w-4" />Aparência
          </button>
          <button type="button" onClick={() => setSection("account")} aria-current={section === "account" ? "page" : undefined}
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${section === "account" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}>
            <FontAwesomeIcon icon={faUser} className="h-4 w-4" />Conta
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 md:px-12 md:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-7 flex items-center justify-between sm:hidden">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />{t("settings.backToApp")}
            </Link>
            <select aria-label="Seção de configurações" value={section} onChange={(event) => setSection(event.target.value as "general" | "appearance" | "account")}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="general">{t("settings.general")}</option><option value="appearance">Aparência</option><option value="account">Conta</option>
            </select>
          </div>

          {section === "general" ? (
            <>
              <h1 className="mb-7 text-2xl font-semibold tracking-tight">{t("settings.general")}</h1>
              <div className="flex flex-col gap-5 rounded-2xl border border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0"><h2 className="text-sm font-semibold">{t("settings.language.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("settings.language.description")}</p></div>
                <div className="relative shrink-0">
                  <label className="sr-only" htmlFor="language-preference">{t("settings.language.title")}</label>
                  <select id="language-preference" value={languagePreference} onChange={(event) => handleLanguageChange(event.target.value)}
                    className="min-h-10 min-w-44 appearance-none rounded-full border border-border bg-surface-muted py-2 pl-4 pr-10 text-sm font-medium text-foreground outline-none transition-colors hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-primary">
                    {languages.map((language) => <option key={language.value} value={language.value}>{t(language.labelKey)}</option>)}
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </>
          ) : section === "appearance" ? (
            <>
              <h1 className="mb-2 text-2xl font-semibold tracking-tight">Aparência</h1>
              <p className="mb-8 text-sm text-muted-foreground">Personalize o visual do Marvi Hub do seu jeito.</p>
              <section aria-labelledby="visual-style-heading" className="mb-8">
                <h2 id="visual-style-heading" className="mb-3 text-sm font-semibold">Estilo visual</h2>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div><h3 className="text-sm font-semibold">Modo</h3><p className="mt-1 text-xs text-muted-foreground">Escolha como o painel será exibido</p></div>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Modo de aparência">
                      {modes.map((mode) => <button key={mode.id} type="button" onClick={() => setTheme(mode.id)} aria-pressed={activeTheme === mode.id}
                        className={`flex min-w-20 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${activeTheme === mode.id ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "border-border bg-surface hover:bg-surface-muted"}`}>
                        <FontAwesomeIcon icon={mode.icon} className="h-3.5 w-3.5" />{mode.label}
                      </button>)}
                    </div>
                  </div>
                  <div className="divide-y divide-border px-4 sm:px-5">
                    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div><h3 className="text-sm font-semibold">Cor de destaque</h3><p className="mt-1 text-xs text-muted-foreground">Usada em botões, links e indicadores</p></div>
                      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cor de destaque">
                        {accents.map((accent) => <button key={accent.value} type="button" onClick={() => updateAppearance("accent", accent.value)} aria-label={accent.label} aria-pressed={appearance.accent === accent.value}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${appearance.accent === accent.value ? "border-foreground" : "border-transparent"}`}>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: accent.value }}>{appearance.accent === accent.value && <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-white" />}</span>
                        </button>)}
                        <label title="Escolher outra cor" className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border text-lg text-muted-foreground">+
                          <input type="color" aria-label="Cor de destaque personalizada" value={isHexColor(appearance.accent) ? appearance.accent : "#ff302c"} onChange={(event) => updateAppearance("accent", event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                        </label>
                      </div>
                    </div>
                    <ColorSetting label="Plano de fundo" value={appearance.background} onChange={(value) => updateAppearance("background", value)} placeholder="Padrão" />
                    <ColorSetting label="Texto" value={appearance.foreground} onChange={(value) => updateAppearance("foreground", value)} placeholder="Padrão" />
                  </div>
                </div>
              </section>

              <details className="group mb-5">
                <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">Avançado <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 transition-transform group-open:rotate-180" /></summary>
                <div className="overflow-hidden rounded-2xl border border-border px-4 sm:px-5">
                  <RangeSetting label="Tamanho da interface" description="Ajusta o tamanho do texto em todo o painel" value={appearance.fontSize} min={14} max={20} suffix="px" onChange={(value) => updateAppearance("fontSize", value)} />
                  <RangeSetting label="Tamanho da fonte de código" description="Ajusta o tamanho da fonte monoespaçada" value={appearance.codeFontSize} min={11} max={18} suffix="px" onChange={(value) => updateAppearance("codeFontSize", value)} />
                </div>
              </details>
              <div className="mb-5 overflow-hidden rounded-2xl border border-border px-4 sm:px-5">
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="text-sm font-semibold">Reduzir movimento</h3><p className="mt-1 text-xs text-muted-foreground">Reduz animações e transições da interface</p></div>
                  <button type="button" role="switch" aria-checked={appearance.reduceMotion} aria-label="Reduzir movimento" onClick={() => updateAppearance("reduceMotion", !appearance.reduceMotion)} className={`relative h-6 w-11 rounded-full transition-colors ${appearance.reduceMotion ? "bg-primary" : "bg-surface-muted ring-1 ring-border"}`}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${appearance.reduceMotion ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-border px-4 py-4 sm:px-5">
                <label htmlFor="contrast-range" className="flex items-center justify-between gap-4"><span className="text-sm font-semibold">Contraste</span><span className="text-sm tabular-nums text-muted-foreground">{appearance.contrast}</span></label>
                <input id="contrast-range" type="range" min="0" max="100" value={appearance.contrast} onChange={(event) => updateAppearance("contrast", Number(event.target.value))} className="mt-4 w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Suave</span><span>Alto</span></div>
              </div>
            </>
          ) : (
            <AccountSettings
              profile={accountProfile}
              fallback={{ id: user?.id, name: user?.name, email: user?.email, roles: user?.roles }}
              marketName={tenant?.marketName}
              marketStatus={tenant?.status}
              loading={accountLoading}
              error={accountError}
              onRetry={() => setAccountReload((value) => value + 1)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ColorSetting({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const color = isHexColor(value) ? value : "#ffffff";
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
        <input type="color" aria-label={`${label}: escolher cor`} value={color} onChange={(event) => onChange(event.target.value)} className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0" />
        <input aria-label={`${label}: código hexadecimal`} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onBlur={() => { if (!isHexColor(value)) onChange(""); }} className="w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
        {value && <button type="button" aria-label={`Restaurar ${label.toLowerCase()} padrão`} onClick={() => onChange("")} className="text-xs text-muted-foreground hover:text-foreground">Padrão</button>}
      </div>
    </div>
  );
}

function RangeSetting({ label, description, value, min, max, suffix, onChange }: { label: string; description: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      <label className="flex shrink-0 items-center gap-2"><span className="sr-only">{label}</span><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} className="w-16 rounded-md border border-border bg-surface-muted px-2 py-1.5 text-sm" /><span className="text-xs text-muted-foreground">{suffix}</span></label>
    </div>
  );
}

function AccountSettings({
  profile,
  fallback,
  marketName,
  marketStatus,
  loading,
  error,
  onRetry,
}: {
  profile: AccountProfile | null;
  fallback: AccountProfile;
  marketName?: string;
  marketStatus?: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { i18n: activeI18n } = useTranslation();
  const details = { ...fallback, ...profile };
  const roleNames = details.roles?.map((role) => role.name).filter(Boolean).join(", ");
  const createdAt = details.createdAt && !Number.isNaN(Date.parse(details.createdAt))
    ? new Intl.DateTimeFormat(activeI18n.language, { dateStyle: "long" }).format(new Date(details.createdAt))
    : null;

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Conta</h1>
      <p className="mb-8 text-sm text-muted-foreground">Informações do seu usuário e do acesso ao mercado.</p>
      {error && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">Não foi possível carregar os dados mais recentes da conta. Exibindo os dados da sessão.</span>
          <button type="button" onClick={onRetry} className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-muted">Tentar novamente</button>
        </div>
      )}
      <section aria-labelledby="account-general-heading" className="mb-6">
        <h2 id="account-general-heading" className="mb-3 text-sm font-semibold">Informações gerais</h2>
        <div className="overflow-hidden rounded-2xl border border-border px-4 sm:px-5">
          <AccountRow icon={faUser} label="Nome" value={details.name} loading={loading} />
          <AccountRow icon={faEnvelope} label="E-mail" value={details.email} loading={loading} />
          <AccountRow icon={faIdCard} label="Identificador da conta" value={details.id} loading={loading} />
          <AccountRow
            icon={details.active === false ? faCircleXmark : faCircleCheck}
            label="Status da conta"
            value={details.active === undefined ? "Não informado" : details.active ? "Ativa" : "Inativa"}
            valueClass={details.active === false ? "text-destructive" : details.active ? "text-positive" : undefined}
            loading={loading}
          />
          {createdAt && <AccountRow icon={faCalendarDays} label="Membro desde" value={createdAt} loading={loading} />}
          <AccountRow icon={faUser} label="Perfil de acesso" value={roleNames || "Não informado"} loading={loading} />
        </div>
      </section>
      <section aria-labelledby="account-market-heading">
        <h2 id="account-market-heading" className="mb-3 text-sm font-semibold">Mercado atual</h2>
        <div className="overflow-hidden rounded-2xl border border-border px-4 sm:px-5">
          <AccountRow icon={faStore} label="Nome" value={marketName} loading={false} />
          <AccountRow icon={faCircleCheck} label="Status do mercado" value={marketStatus} loading={false} />
        </div>
      </section>
    </>
  );
}

function AccountRow({
  icon,
  label,
  value,
  valueClass,
  loading,
}: {
  icon: typeof faUser;
  label: string;
  value?: string | null;
  valueClass?: string;
  loading: boolean;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <FontAwesomeIcon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`max-w-[60%] break-all text-right text-sm ${valueClass ?? "text-muted-foreground"}`}>
        {loading ? "Carregando…" : value || "Não informado"}
      </span>
    </div>
  );
}

