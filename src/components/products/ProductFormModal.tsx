"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { getApiErrorMessage, getFieldErrors } from "@/lib/api/errors";
import type {
  Category,
  Product,
  ProductImageUploadUrlResponse,
} from "@/lib/types/product";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faCircleNotch } from "@fortawesome/free-solid-svg-icons";

interface ProductFormModalProps {
  /** Produto em edição; null para criação. O componente só é montado quando aberto. */
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  /** Chamado sempre que o produto é criado/atualizado com sucesso. */
  onSaved: (product: Product) => void;
}

interface ProductFormState {
  name: string;
  description: string;
  categoryId: string;
  sku: string;
  barcode: string;
  price: string;
  promotionalPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
  active: boolean;
}

/**
 * Fluxo de upload de imagem em três etapas (conforme o Core API):
 * 1. POST /api/products/{id}/image-upload-url — URL pré-assinada;
 * 2. PUT direto ao armazenamento com o arquivo;
 * 3. PATCH /api/products/{id}/image — confirma a URL pública.
 * Falha em qualquer etapa lança um erro específico, sem deixar o produto em
 * estado de sucesso parcial.
 */
async function uploadProductImage(
  productId: string,
  file: File,
): Promise<Product> {
  const contentType = file.type || "application/octet-stream";

  let uploadInfo: ProductImageUploadUrlResponse;
  try {
    uploadInfo = await api.post<ProductImageUploadUrlResponse>(
      `/api/products/${productId}/image-upload-url`,
      { fileName: file.name, contentType },
    );
  } catch (err) {
    throw new Error(
      `falha ao solicitar a URL de upload (${getApiErrorMessage(err, "erro desconhecido")}).`,
    );
  }

  let putResponse: Response;
  try {
    putResponse = await fetch(uploadInfo.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch {
    throw new Error("falha ao enviar o arquivo para o armazenamento.");
  }
  if (!putResponse.ok) {
    throw new Error(
      `falha ao enviar o arquivo para o armazenamento (HTTP ${putResponse.status}).`,
    );
  }

  try {
    return await api.patch<Product>(`/api/products/${productId}/image`, {
      imageUrl: uploadInfo.publicUrl,
    });
  } catch (err) {
    throw new Error(
      `falha ao confirmar a imagem (${getApiErrorMessage(err, "erro desconhecido")}).`,
    );
  }
}

function parseDecimal(value: string): number | null {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntStrict(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : null;
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-foreground transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-2 block text-sm font-medium text-foreground";
const errorClass = "mt-2 text-xs text-destructive";

export function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormState>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.category?.id ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    price: product?.price != null ? String(product.price) : "",
    promotionalPrice:
      product?.promotionalPrice != null ? String(product.promotionalPrice) : "",
    stockQuantity:
      product?.stockQuantity != null ? String(product.stockQuantity) : "",
    lowStockThreshold:
      product?.lowStockThreshold != null
        ? String(product.lowStockThreshold)
        : "",
    active: product?.active ?? true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /**
   * Guarda o id do produto criado nesta sessão do modal. Se a criação foi
   * concluída mas o upload da imagem falhou, uma nova tentativa usa PUT em vez
   * de POST, evitando produtos duplicados.
   */
  const [savedProductId, setSavedProductId] = useState<string | null>(
    product?.id ?? null,
  );

  const categoryOptions = useMemo<Category[]>(() => {
    const options = [...categories];
    if (
      product?.category &&
      !options.some((category) => category.id === product.category?.id)
    ) {
      options.unshift({
        id: product.category.id,
        name: product.category.name,
        description: null,
        active: true,
        createdAt: "",
        updatedAt: "",
        deletedAt: null,
      });
    }
    return options;
  }, [categories, product]);

  function updateField(field: keyof ProductFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }

  function validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) {
      errors.name = "Informe o nome do produto.";
    } else if (name.length > 160) {
      errors.name = "O nome deve ter no máximo 160 caracteres.";
    }
    if (form.sku.trim().length > 80) {
      errors.sku = "O SKU deve ter no máximo 80 caracteres.";
    }
    if (form.barcode.trim().length > 80) {
      errors.barcode = "O código de barras deve ter no máximo 80 caracteres.";
    }
    if (form.price.trim() === "") {
      errors.price = "Informe o preço.";
    } else if (parseDecimal(form.price) == null || (parseDecimal(form.price) as number) < 0) {
      errors.price = "Informe um preço válido (maior ou igual a zero).";
    }
    if (form.promotionalPrice.trim() !== "") {
      const promotionalPrice = parseDecimal(form.promotionalPrice);
      if (promotionalPrice == null || promotionalPrice < 0) {
        errors.promotionalPrice =
          "Informe um preço promocional válido (maior ou igual a zero).";
      }
    }
    if (form.stockQuantity.trim() === "") {
      errors.stockQuantity = "Informe a quantidade em estoque.";
    } else if (
      parseIntStrict(form.stockQuantity) == null ||
      (parseIntStrict(form.stockQuantity) as number) < 0
    ) {
      errors.stockQuantity =
        "O estoque deve ser um número inteiro, maior ou igual a zero.";
    }
    if (form.lowStockThreshold.trim() !== "") {
      const lowStockThreshold = parseIntStrict(form.lowStockThreshold);
      if (lowStockThreshold == null || lowStockThreshold < 0) {
        errors.lowStockThreshold =
          "O limite de estoque baixo deve ser um inteiro, maior ou igual a zero.";
      }
    }
    return errors;
  }

  function buildPayload() {
    const promotionalPrice =
      form.promotionalPrice.trim() !== ""
        ? parseDecimal(form.promotionalPrice)
        : null;
    const lowStockThreshold =
      form.lowStockThreshold.trim() !== ""
        ? parseIntStrict(form.lowStockThreshold)
        : null;

    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId || undefined,
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      price: parseDecimal(form.price) as number,
      promotionalPrice: promotionalPrice ?? undefined,
      stockQuantity: parseIntStrict(form.stockQuantity) as number,
      lowStockThreshold: lowStockThreshold ?? undefined,
      active: form.active,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm();
    setFieldErrors(errors);
    setBanner(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const payload = buildPayload();
      const existingId = product?.id ?? savedProductId;

      let saved: Product;
      if (existingId) {
        saved = await api.put<Product>(`/api/products/${existingId}`, payload);
      } else {
        saved = await api.post<Product>("/api/products", payload);
        setSavedProductId(saved.id);
      }

      if (imageFile) {
        try {
          saved = await uploadProductImage(saved.id, imageFile);
        } catch (imageError) {
          // Produto persistido, mas a imagem não: mantém o modal aberto com o
          // erro visível para não exibir um sucesso parcial.
          setBanner(
            `Produto salvo, mas o envio da imagem falhou: ${
              imageError instanceof Error
                ? imageError.message
                : "erro desconhecido."
            }`,
          );
          onSaved(saved);
          return;
        }
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      const apiFieldErrors = getFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      }
      setBanner(getApiErrorMessage(err, "Erro ao salvar o produto."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-7 lg:p-8"
      >
        <header className="flex items-center gap-4 border-b border-border pb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faBoxOpen} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catálogo de produtos</p>
            <h2 id="product-form-title" className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {product ? "Editar produto" : "Novo produto"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Mantenha os dados e a disponibilidade do produto atualizados.</p>
          </div>
        </header>

        {banner && (
          <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {banner}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <section className="rounded-2xl border border-border bg-surface-muted/20 p-4 sm:p-6">
            <div className="mb-5">
              <h3 className="font-semibold text-foreground">Informações do produto</h3>
              <p className="mt-1 text-sm text-muted-foreground">Nome, categoria e identificadores do catálogo.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="product-name" className={labelClass}>
                Nome
              </label>
              <input
                id="product-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass}
                placeholder="Ex.: Arroz Branco 5kg"
              />
              {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="product-description" className={labelClass}>
                Descrição
              </label>
              <textarea
                id="product-description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
                placeholder="Descrição opcional"
                className="min-h-[6rem] w-full rounded-lg border border-border bg-surface px-3 py-3 text-foreground transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="product-category" className={labelClass}>
                Categoria
              </label>
              <select
                id="product-category"
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}
                className={inputClass}
              >
                <option value="">Sem categoria</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-sku" className={labelClass}>
                SKU
              </label>
              <input
                id="product-sku"
                type="text"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                className={inputClass}
                placeholder="Ex.: ARR-5KG"
              />
              {fieldErrors.sku && <p className={errorClass}>{fieldErrors.sku}</p>}
            </div>

            <div>
              <label htmlFor="product-barcode" className={labelClass}>
                Código de barras
              </label>
              <input
                id="product-barcode"
                type="text"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
                className={inputClass}
              />
              {fieldErrors.barcode && (
                <p className={errorClass}>{fieldErrors.barcode}</p>
              )}
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface-muted/20 p-4 sm:p-6">
            <div className="mb-5">
              <h3 className="font-semibold text-foreground">Preço e estoque</h3>
              <p className="mt-1 text-sm text-muted-foreground">Defina os valores de venda e os níveis de reposição.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="product-price" className={labelClass}>
                Preço (R$)
              </label>
              <input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                className={inputClass}
                placeholder="0,00"
              />
              {fieldErrors.price && <p className={errorClass}>{fieldErrors.price}</p>}
            </div>

            <div>
              <label htmlFor="product-promotional-price" className={labelClass}>
                Preço promocional (R$)
              </label>
              <input
                id="product-promotional-price"
                type="number"
                step="0.01"
                min="0"
                value={form.promotionalPrice}
                onChange={(e) => updateField("promotionalPrice", e.target.value)}
                className={inputClass}
                placeholder="Opcional"
              />
              {fieldErrors.promotionalPrice && (
                <p className={errorClass}>{fieldErrors.promotionalPrice}</p>
              )}
            </div>

            <div>
              <label htmlFor="product-stock" className={labelClass}>
                Estoque
              </label>
              <input
                id="product-stock"
                type="number"
                step="1"
                min="0"
                value={form.stockQuantity}
                onChange={(e) => updateField("stockQuantity", e.target.value)}
                className={inputClass}
              />
              {fieldErrors.stockQuantity && (
                <p className={errorClass}>{fieldErrors.stockQuantity}</p>
              )}
            </div>

            <div>
              <label htmlFor="product-low-stock-threshold" className={labelClass}>
                Limite de estoque baixo
              </label>
              <input
                id="product-low-stock-threshold"
                type="number"
                step="1"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => updateField("lowStockThreshold", e.target.value)}
                className={inputClass}
                placeholder="Opcional"
              />
              {fieldErrors.lowStockThreshold && (
                <p className={errorClass}>{fieldErrors.lowStockThreshold}</p>
              )}
            </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-surface-muted/20 p-4 sm:p-6 md:grid-cols-2">
            <div>
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Imagem do produto</h3>
                <p className="mt-1 text-sm text-muted-foreground">Adicione uma imagem para facilitar a identificação.</p>
              </div>
              <label htmlFor="product-image" className={labelClass}>
                Arquivo de imagem
              </label>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-4 file:py-2.5 file:font-medium file:text-foreground hover:file:bg-surface"
              />
              {imageFile ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {imageFile.name} será enviado após salvar o produto.
                </p>
              ) : product?.imageUrl ? (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={`Imagem atual de ${product.name}`}
                    className="h-14 w-14 rounded-lg border border-border object-cover"
                  />
                  <span className="text-xs text-muted-foreground">Imagem atual</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col justify-center rounded-xl border border-border bg-surface/70 p-4">
              <p className="font-medium text-foreground">Disponibilidade</p>
              <p className="mt-1 text-sm text-muted-foreground">Produtos inativos não ficam disponíveis no catálogo.</p>
              <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => updateField("active", e.target.checked)}
                  className="h-5 w-5 rounded accent-primary"
                />
                Ativo no catálogo
              </label>
            </div>
          </section>

          <footer className="flex justify-end gap-2 border-t border-border pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <FontAwesomeIcon icon={faCircleNotch} className="h-3 w-3 animate-spin" />}
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
