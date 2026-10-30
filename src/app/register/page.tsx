"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  faArrowRight,
  faBoxArchive,
  faBullhorn,
  faCartShopping,
  faClipboardList,
  faCircleExclamation,
  faEye,
  faEyeSlash,
  faStore,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/lib/auth/auth-context";
import styles from "./register.module.css";

const benefits = [
  { icon: faClipboardList, label: "Gestão de produtos" },
  { icon: faBoxArchive, label: "Controle de estoque" },
  { icon: faCartShopping, label: "Pedidos em tempo real" },
  { icon: faBullhorn, label: "Promoções e cupons" },
  { icon: faUsers, label: "Usuários e permissões" },
];

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCnpjChange(event: ChangeEvent<HTMLInputElement>) {
    setCnpj(formatCnpj(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasError(false);
    setErrorMessage("");
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      marketName: (formData.get("marketName") as string) ?? "",
      slug: (formData.get("marketSlug") as string) || undefined,
      documentNumber: cnpj.replace(/\D/g, ""),
      contactEmail: (formData.get("marketEmail") as string) ?? "",
      ownerName: (formData.get("ownerName") as string) ?? "",
      ownerEmail: (formData.get("ownerEmail") as string) ?? "",
      ownerPassword: (formData.get("password") as string) ?? "",
    };

    try {
      const result = await register(payload);

      if ("status" in result && result.status === "TENANT_SELECTION_REQUIRED") {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.data?.message ?? err.message ?? "Erro ao criar sua conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-label="Cadastro no Marvi Hub">
        <aside className={styles.intro}>
          <div className={styles.introContent}>
            <div className={styles.brand} aria-label="Marvi Hub">
              <span className={styles.brandIcon} aria-hidden="true">
                <FontAwesomeIcon icon={faCartShopping} />
              </span>
              <span>
                <strong>Marvi Hub</strong>
                <small>Intelligent retail management</small>
              </span>
            </div>

            <h1>Comece a gerenciar seu supermercado</h1>
            <p className={styles.description}>
              Cadastre seu mercado e organize sua operação em poucos minutos.
            </p>

            <ul className={styles.benefits} aria-label="Recursos da plataforma">
              {benefits.map((benefit) => (
                <li key={benefit.label}>
                  <span className={styles.benefitIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={benefit.icon} />
                  </span>
                  {benefit.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className={styles.formPanel} aria-labelledby="register-title">
          <div className={styles.formWrap}>
            <header className={styles.formHeader}>
              <h2 id="register-title">Criar nova conta</h2>
              <p>Preencha os dados abaixo para configurar sua unidade.</p>
            </header>

            {(hasError || errorMessage) && (
              <div className={styles.alert} role="alert">
                <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <fieldset className={styles.fieldset}>
                <legend>
                  <FontAwesomeIcon icon={faStore} aria-hidden="true" />
                  Mercado
                </legend>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="market-name">Nome do mercado</label>
                    <input
                      id="market-name"
                      name="marketName"
                      placeholder="Ex: Supermercado Estrela"
                      autoComplete="organization"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="market-slug">Slug <span>(opcional)</span></label>
                    <input
                      id="market-slug"
                      name="marketSlug"
                      placeholder="marvi.hub/estrela"
                      autoCapitalize="none"
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="cnpj">CNPJ</label>
                    <input
                      id="cnpj"
                      name="cnpj"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="market-email">E-mail de contato</label>
                    <input
                      id="market-email"
                      name="marketEmail"
                      type="email"
                      placeholder="contato@empresa.com"
                      autoComplete="email"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend>
                  <FontAwesomeIcon icon={faUser} aria-hidden="true" />
                  Responsável
                </legend>
                <div className={styles.fieldGrid}>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label htmlFor="owner-name">Nome do responsável</label>
                    <input
                      id="owner-name"
                      name="ownerName"
                      placeholder="Nome completo"
                      autoComplete="name"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="owner-email">E-mail do responsável</label>
                    <input
                      id="owner-email"
                      name="ownerEmail"
                      type="email"
                      placeholder="email@responsavel.com"
                      autoComplete="email"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="password">Senha</label>
                    <div className={styles.passwordInput}>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        disabled={loading}
                      >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                  </div>
                </div>
              </fieldset>

              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? "Criando conta..." : "Criar conta"}
                <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
              </button>
            </form>

            <p className={styles.loginPrompt}>
              Já tem uma conta? <Link href="/login">Entrar</Link>
            </p>
          </div>
        </section>
      </section>

      <footer className={styles.footer}>
        <a href="#termos">Termos de Uso</a>
        <span aria-hidden="true">·</span>
        <a href="#privacidade">Privacidade</a>
        <span aria-hidden="true">·</span>
        <a href="#suporte">Suporte</a>
      </footer>
    </main>
  );
}
