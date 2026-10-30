"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  PageResponse,
  Product,
  StockMovement,
  StockOperation,
} from "@/lib/types/product";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch, faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";

const MOVEMENTS_PAGE_SIZE = 5;

const OPERATION_OPTIONS: Array<{ value: StockOperation; label: string }> = [
  { value: "SET", label: "Definir (SET)" },
  { value: "INCREMENT", label: "Adicionar (INCREMENT)" },
  { value: "DECREMENT", label: "Remover (DECREMENT)" },
];

const OPERATION_LABELS: Record<StockOperation, string> = {
  SET: "Definição",
  INCREMENT: "Entrada",
  DECREMENT: "Saída",
};

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-foreground transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-2 block text-sm font-medium text-foreground";

interface StockModalProps {
  /** Produto selecionado. O componente só é montado quando aberto. */
  product: Product;
  onClose: () => void;
  /** Chamado após um ajuste bem-sucedido, com o produto atualizado. */
  onAdjusted: (product: Product) => void;
}

function formatDateTimeBR(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockModal({ product, onClose, onAdjusted }: StockModalProps) {
  const [operation, setOperation] = useState<StockOperation>("SET");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const [movements, setMovements] = useState<PageResponse<StockMovement> | null>(null);
  const [movementsPageState, setMovementsPageState] = useState({
    page: 0,
    // Muda a identidade do objeto para forçar recarga (ex.: após um ajuste).
    reloadId: 0,
  });
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const data = await api.get<PageResponse<StockMovement>>(
        `/api/products/${product.id}/stock-movements?page=${movementsPageState.page}&size=${MOVEMENTS_PAGE_SIZE}`,
      );
      setMovements(data);
    } catch (err) {
      setMovementsError(
        getApiErrorMessage(err, "Erro ao carregar o histórico de estoque."),
      );
    } finally {
      setMovementsLoading(false);
    }
  }, [product.id, movementsPageState]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMovements();
  }, [fetchMovements]);

  async function handleAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(quantity.trim());
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setQuantityError(
        "Informe uma quantidade inteira, maior ou igual a zero.",
      );
      return;
    }
    setQuantityError(null);
    setAdjustError(null);
    setAdjusting(true);
    try {
      const updated = await api.patch<Product>(`/api/products/${product.id}/stock`, {
        operation,
        quantity: parsedQuantity,
        reason: reason.trim() || undefined,
      });
      onAdjusted(updated);
      setQuantity("");
      setReason("");
      // Reinicia o histórico na primeira página e o recarrega.
      setMovementsPageState((state) => ({ page: 0, reloadId: state.reloadId + 1 }));
    } catch (err) {
      setAdjustError(getApiErrorMessage(err, "Erro ao ajustar o estoque."));
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !adjusting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-7 lg:p-8"
      >
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faClockRotateLeft} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle de inventário</p>
              <h2 id="stock-modal-title" className="mt-1 truncate text-xl font-semibold text-foreground sm:text-2xl">
                Ajustar estoque
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{product.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <div className="min-w-32 rounded-xl border border-border bg-surface-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Estoque atual</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{product.stockQuantity ?? 0}</p>
            </div>
            {product.lowStockThreshold != null && (
              <div className="min-w-32 rounded-xl border border-border bg-surface-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">Alerta de reposição</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{product.lowStockThreshold}</p>
              </div>
            )}
          </div>
        </header>

        <form onSubmit={handleAdjust} className="mt-6 rounded-2xl border border-border bg-surface-muted/30 p-4 sm:p-6" noValidate>
          <div className="mb-5">
            <h3 className="font-semibold text-foreground">Registrar movimentação</h3>
            <p className="mt-1 text-sm text-muted-foreground">Informe a operação e a quantidade para atualizar o saldo.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr] lg:gap-5">
            <div>
              <label htmlFor="stock-operation" className={labelClass}>
                Operação
              </label>
              <select
                id="stock-operation"
                value={operation}
                onChange={(e) => setOperation(e.target.value as StockOperation)}
                className={inputClass}
              >
                {OPERATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stock-quantity" className={labelClass}>
                Quantidade
              </label>
              <input
                id="stock-quantity"
                type="number"
                step="1"
                min="0"
                placeholder="Ex.: 10"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setQuantityError(null);
                }}
                className={inputClass}
              />
              {quantityError && (
                <p role="alert" className="mt-2 text-xs text-destructive">{quantityError}</p>
              )}
            </div>
            <div>
              <label htmlFor="stock-reason" className={labelClass}>
                Motivo
              </label>
              <input
                id="stock-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
                placeholder="Ex.: Recebimento de mercadoria"
              />
            </div>
          </div>

          {adjustError && (
            <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {adjustError}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={adjusting}
              className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adjusting && (
                <FontAwesomeIcon icon={faCircleNotch} className="h-3 w-3 animate-spin" />
              )}
              Ajustar estoque
            </button>
          </div>
        </form>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4 text-primary" />
                Histórico de movimentações
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">Acompanhe entradas, saídas e alterações anteriores.</p>
            </div>
            {movements && <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">{movements.totalElements} registros</span>}
          </div>

          {movementsLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="mh-dash-skeleton h-10 w-full rounded-sm"
                />
              ))}
            </div>
          ) : movementsError ? (
            <div className="mt-4" role="alert">
              <p className="text-sm text-destructive">{movementsError}</p>
              <button
                type="button"
                onClick={() =>
                  setMovementsPageState((state) => ({
                    ...state,
                    reloadId: state.reloadId + 1,
                  }))
                }
                className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-muted"
              >
                Tentar novamente
              </button>
            </div>
          ) : !movements || movements.content.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma movimentação registrada para este produto.
            </p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Operação</th>
                      <th className="px-4 py-3 text-right">Anterior</th>
                      <th className="px-4 py-3 text-right">Alterado</th>
                      <th className="px-4 py-3 text-right">Novo</th>
                      <th className="px-4 py-3">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.content.map((movement) => (
                      <tr key={movement.id} className="border-b border-border last:border-0 transition-colors hover:bg-surface-muted/40">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDateTimeBR(movement.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            {OPERATION_LABELS[movement.operation] ?? movement.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {movement.previousQuantity ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{movement.changedQuantity}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{movement.newQuantity}</td>
                        <td className="max-w-64 break-words px-4 py-3 text-muted-foreground">
                          {movement.reason ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {movements.totalElements} movimentação(ões)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMovementsPageState((state) => ({
                        ...state,
                        page: Math.max(0, state.page - 1),
                      }))
                    }
                    disabled={movementsPageState.page === 0}
                    className="rounded-lg border border-border px-3 py-2 text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="px-1 text-muted-foreground">
                    Página {movementsPageState.page + 1} de {Math.max(1, movements.totalPages)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMovementsPageState((state) =>
                        state.page >= movements.totalPages - 1
                          ? state
                          : { ...state, page: state.page + 1 },
                      )
                    }
                    disabled={movementsPageState.page >= movements.totalPages - 1}
                    className="rounded-lg border border-border px-3 py-2 text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <footer className="mt-7 flex justify-end border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
