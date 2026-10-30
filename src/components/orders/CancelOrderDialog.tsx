"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faCircleNotch,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { OrderSummary } from "@/lib/types/order";

const CANCEL_REASON_MAX_LENGTH = 1000;

interface CancelOrderDialogProps {
  /** Pedido selecionado. O diálogo só é renderizado quando open. */
  order: OrderSummary;
  /** Chamado após confirmação válida; deve executar o PATCH e lançar em erro. */
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Confirmação de cancelamento de pedido com motivo obrigatório.
 *
 * O motivo é validado no frontend (obrigatório, máximo de 1000 caracteres —
 * mesmo limite do Core API) e erros retornados pelo servidor (ex.:
 * CANCEL_REASON_REQUIRED, INSUFFICIENT_STOCK, INVALID_ORDER_STATUS_TRANSITION)
 * são exibidos sem fechar o diálogo.
 */
export function CancelOrderDialog({
  order,
  onConfirm,
  onCancel,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("Informe o motivo do cancelamento.");
      return;
    }
    if (trimmed.length > CANCEL_REASON_MAX_LENGTH) {
      setReasonError(
        `O motivo deve ter no máximo ${CANCEL_REASON_MAX_LENGTH} caracteres.`,
      );
      return;
    }
    setReasonError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      // Mantém o diálogo aberto para exibir a validação/erro do servidor.
      setSubmitError(
        getApiErrorMessage(err, "Erro ao cancelar o pedido."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !submitting) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <FontAwesomeIcon icon={faBan} className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="cancel-order-title" className="text-lg font-semibold text-foreground">
              Cancelar pedido
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tem certeza que deseja cancelar o pedido{" "}
              <strong className="text-foreground">{order.orderNumber}</strong>?
              {order.status === "PREPARING" && (
                <>
                  {" "}
                  O estoque reservado por ele será devolvido automaticamente.
                </>
              )}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4" noValidate>
          <label
            htmlFor="cancel-order-reason"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Motivo do cancelamento <span className="text-destructive">*</span>
          </label>
          <textarea
            id="cancel-order-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(null);
            }}
            rows={3}
            maxLength={CANCEL_REASON_MAX_LENGTH + 1}
            disabled={submitting}
            aria-invalid={reasonError != null}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
            placeholder="Ex.: Cliente desistiu da compra"
          />
          {reasonError ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {reasonError}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Obrigatório · máximo de {CANCEL_REASON_MAX_LENGTH} caracteres.
            </p>
          )}

          {submitError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {submitting ? (
                <FontAwesomeIcon icon={faCircleNotch} className="h-3 w-3 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3" />
              )}
              Confirmar cancelamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
