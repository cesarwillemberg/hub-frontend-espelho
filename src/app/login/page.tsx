"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  faArrowRightToBracket,
  faBullhorn,
  faCartShopping,
  faCircleExclamation,
  faClipboardList,
  faEye,
  faEyeSlash,
  faStore,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/lib/auth/auth-context";
import { AppControls } from "@/components/shared/AppControls";
import styles from "./login.module.css";

const capabilities = [
  { labelKey: "login.intro.products", icon: faClipboardList },
  { labelKey: "login.intro.orders", icon: faCartShopping },
  { labelKey: "login.intro.inventory", icon: faStore },
  { labelKey: "login.intro.promotions", icon: faBullhorn },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    login,
    isAuthenticated,
    loading: authLoading,
    pendingSelection,
    setPendingSelection,
  } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Redireciona para o dashboard apenas quando o usuário JÁ estava autenticado
  // ao carregar a página (ex: acessou /login direto com sessão válida). A checagem
  // roda uma única vez, antes de qualquer submit — depois disso, o handleSubmit
  // é o único responsável pela navegação (sempre para /selecionar-mercado).
  const hasCheckedInitialAuth = useRef(false);

  useEffect(() => {
    if (authLoading || hasCheckedInitialAuth.current) return;
    hasCheckedInitialAuth.current = true;
    if (isAuthenticated && !pendingSelection) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, authLoading, pendingSelection, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasError(false);
    setErrorMessage("");
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";

    try {
      const result = await login({ email, password });

      if ("status" in result && result.status === "TENANT_SELECTION_REQUIRED") {
        setPendingSelection({
          selectionToken: result.selectionToken,
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
          },
          tenants: result.tenants,
        });
        router.push("/selecionar-mercado");
        return;
      }

      // Login direto (1 tenant): segue para a tela de seleção de mercado
      router.push("/selecionar-mercado");
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(
        err.data?.message ?? err.message ?? t("login.invalidCredentials"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCreateMarket() {
    router.push("/criar-conta");
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-label="Marvi Hub">
        <aside className={styles.intro}>
          <div className={styles.introContent}>
            <div className={styles.brand}>
              <FontAwesomeIcon icon={faCartShopping} aria-hidden="true" />
              <span>Marvi Hub</span>
            </div>

            <h1>{t("login.intro.title")}</h1>
            <p className={styles.description}>
              {t("login.intro.description")}
            </p>

            <ul className={styles.capabilities} aria-label={t("login.intro.capabilities")}>
              {capabilities.map((capability) => (
                <li key={capability.labelKey}>
                  <span className={styles.capabilityIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={capability.icon} />
                  </span>
                  <span>{t(capability.labelKey)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className={styles.loginPanel} aria-labelledby="login-title">
          <div className={styles.controls}>
            <AppControls />
          </div>
          <div className={styles.formWrap}>
            <header className={styles.formHeader}>
              <h2 id="login-title">{t("login.title")}</h2>
              <p>{t("login.subtitle")}</p>
            </header>

            {(hasError || errorMessage) && (
              <div className={styles.alert} role="alert">
                <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
                <span>{errorMessage || t("login.invalidCredentials")}</span>
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="email">{t("login.email")}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  autoComplete="email"
                  onChange={() => setHasError(false)}
                  required
                  disabled={loading || authLoading}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label htmlFor="password">{t("login.password")}</label>
                  <a href="#recuperar-email">{t("login.forgotEmail")}</a>
                </div>
                <div className={styles.passwordInput}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    onChange={() => setHasError(false)}
                    required
                    disabled={loading || authLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((currentValue) => !currentValue)}
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    aria-pressed={showPassword}
                    disabled={loading || authLoading}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className={styles.options}>
                <label className={styles.remember} htmlFor="remember">
                  <input id="remember" name="remember" type="checkbox" />
                  <span>{t("login.rememberMe")}</span>
                </label>
                <a href="#recuperar-senha">{t("login.forgotPassword")}</a>
              </div>

              <button className={styles.submit} type="submit" disabled={loading || authLoading}>
                <span>
                  {loading ? t("login.signingIn") : t("login.submit")}
                </span>
                <FontAwesomeIcon icon={faArrowRightToBracket} aria-hidden="true" />
              </button>
            </form>

            <p className={styles.signup}>
              {t("login.noAccount")} {" "}
              <button
                type="button"
                onClick={handleCreateMarket}
                className={styles.createMarketLink}
              >
                {t("login.createMarket")}
              </button>
            </p>
            <p className={styles.copyright}>{t("login.copyright")}</p>
          </div>
        </section>
      </section>
    </main>
  );
}
