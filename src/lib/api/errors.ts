/**
 * Extrai uma mensagem de erro amigável de um erro lançado pelo cliente da API.
 *
 * O BFF responde erros no formato `{ error, message }`, onde `message` pode ser
 * uma string (ex.: mensagens do Core API) ou um objeto de erros por campo
 * (respostas 400 VALIDATION_ERROR).
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Ocorreu um erro inesperado.",
): string {
  const e = err as { status?: number; data?: { message?: unknown; error?: string }; message?: string } | null;
  const status = e?.status;
  const raw = e?.data?.message ?? e?.message;

  let message = "";
  if (typeof raw === "string") {
    message = raw.trim();
  } else if (raw && typeof raw === "object") {
    message = Object.entries(raw as Record<string, unknown>)
      .map(
        ([field, issues]) =>
          `${field}: ${Array.isArray(issues) ? issues.join(", ") : String(issues)}`,
      )
      .join("; ");
  }

  if (!message && status === 403) {
    return "Você não tem permissão para executar esta operação.";
  }
  if (!message && status === 401) {
    return "Sessão expirada. Faça login novamente.";
  }
  return message || fallback;
}

/**
 * Extrai os erros por campo de uma resposta 400 VALIDATION_ERROR do BFF,
 * retornando um mapa { campo: mensagem } pronto para exibir no formulário.
 */
export function getFieldErrors(err: unknown): Record<string, string> {
  const e = err as { data?: { error?: string; message?: unknown } } | null;
  const message = e?.data?.message;
  if (e?.data?.error !== "VALIDATION_ERROR" || !message || typeof message !== "object") {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [field, issues] of Object.entries(message as Record<string, unknown>)) {
    result[field] = Array.isArray(issues) ? issues.join(", ") : String(issues);
  }
  return result;
}
