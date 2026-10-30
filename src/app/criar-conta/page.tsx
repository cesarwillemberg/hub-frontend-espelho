"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z, type ZodIssue } from "zod";
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
import styles from "./criar-conta.module.css";

const benefits = [
  { icon: faClipboardList, label: "Gestão de produtos" },
  { icon: faBoxArchive, label: "Controle de estoque" },
  { icon: faCartShopping, label: "Pedidos em tempo real" },
  { icon: faBullhorn, label: "Promoções e cupons" },
  { icon: faUsers, label: "Usuários e permissões" },
];

const registerSchema = z.object({
  marketName: z.string().min(3, "O nome do mercado deve ter pelo menos 3 caracteres."),
  slug: z.string().optional(),
  documentNumber: z.string().min(14, "CNPJ inválido. Informe 14 dígitos."),
  contactEmail: z.string().email("E-mail de contato inválido."),
  ownerName: z.string().min(2, "O nome do responsável deve ter pelo menos 2 caracteres."),
  ownerEmail: z.string().email("E-mail do responsável inválido."),
  ownerPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

type RegisterFormData = z.infer<typeof registerSchema>;

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function CriarContaPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [formData, setFormData] = useState<RegisterFormData>({
    marketName: "",
    slug: "",
    documentNumber: "",
    contactEmail: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function handleCnpjChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatCnpj(event.target.value);
    setCnpj(formatted);
    setFormData((prev) => ({ ...prev, documentNumber: formatted }));
    setFieldErrors((prev) => ({ ...prev, documentNumber: "" }));
  }

  function handleChange(field: keyof RegisterFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      result.error.issues.forEach((issue: ZodIssue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        marketName: formData.marketName.trim(),
        slug: (formData.slug ?? "").trim() || undefined,
        documentNumber: formData.documentNumber.replace(/\D/g, ""),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.ownerEmail.trim().toLowerCase(),
        ownerPassword: formData.ownerPassword,
      };

      const result = await register(payload);

      if ("status" in result && result.status === "TENANT_SELECTION_REQUIRED") {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      const serverMessage = err.data?.message ?? err.message ?? "Erro ao criar sua conta. Tente novamente.";
      setFormError(serverMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-label="Criar conta no Marvi Hub">
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

            <h1 className={styles.title}>
              Comece a gerenciar seu supermercado
            </h1>
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

        <section className={styles.formPanel} aria-labelledby="criar-conta-title">
          <div className={styles.formWrap}>
            <header className={styles.formHeader}>
              <h2 id="criar-conta-title">Criar nova conta</h2>
              <p>Preencha os dados abaixo para configurar sua unidade.</p>
            </header>

            {formError && (
              <div className={styles.alert} role="alert">
                <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
                      type="text"
                      placeholder="Ex: Supermercado Estrela"
                      autoComplete="organization"
                      required
                      value={formData.marketName}
                      onChange={(e) => handleChange("marketName", e.target.value)}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.marketName}
                    />
                    {fieldErrors.marketName && (
                      <span className={styles.fieldError}>{fieldErrors.marketName}</span>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="market-slug">Slug <span>(opcional)</span></label>
                    <input
                      id="market-slug"
                      name="marketSlug"
                      type="text"
                      placeholder="mercado-central"
                      autoCapitalize="none"
                      value={formData.slug}
                      onChange={(e) => handleChange("slug", e.target.value)}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.slug}
                    />
                    {fieldErrors.slug && (
                      <span className={styles.fieldError}>{fieldErrors.slug}</span>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="cnpj">CNPJ</label>
                    <input
                      id="cnpj"
                      name="cnpj"
                      type="text"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                      maxLength={18}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.documentNumber}
                    />
                    {fieldErrors.documentNumber && (
                      <span className={styles.fieldError}>{fieldErrors.documentNumber}</span>
                    )}
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
                      value={formData.contactEmail}
                      onChange={(e) => handleChange("contactEmail", e.target.value)}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.contactEmail}
                    />
                    {fieldErrors.contactEmail && (
                      <span className={styles.fieldError}>{fieldErrors.contactEmail}</span>
                    )}
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
                      type="text"
                      placeholder="Nome completo"
                      autoComplete="name"
                      required
                      value={formData.ownerName}
                      onChange={(e) => handleChange("ownerName", e.target.value)}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.ownerName}
                    />
                    {fieldErrors.ownerName && (
                      <span className={styles.fieldError}>{fieldErrors.ownerName}</span>
                    )}
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
                      value={formData.ownerEmail}
                      onChange={(e) => handleChange("ownerEmail", e.target.value)}
                      disabled={loading}
                      aria-invalid={!!fieldErrors.ownerEmail}
                    />
                    {fieldErrors.ownerEmail && (
                      <span className={styles.fieldError}>{fieldErrors.ownerEmail}</span>
                    )}
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
                        value={formData.ownerPassword}
                        onChange={(e) => handleChange("ownerPassword", e.target.value)}
                        disabled={loading}
                        aria-invalid={!!fieldErrors.ownerPassword}
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
                    {fieldErrors.ownerPassword && (
                      <span className={styles.fieldError}>{fieldErrors.ownerPassword}</span>
                    )}
                  </div>
                </div>
              </fieldset>

              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? "Criando conta…" : "Criar conta"}
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
