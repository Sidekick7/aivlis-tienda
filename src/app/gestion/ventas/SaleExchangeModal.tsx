"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  Minus,
  Plus,
  Repeat2,
  Search,
  X,
} from "lucide-react";
import { getProducts } from "@/lib/products";
import {
  getEffectiveWebUnitPrice,
  getRetailPrice,
} from "@/lib/pricing";
import { createSaleExchange } from "@/lib/saleExchanges";
import { formatPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";
import type {
  SaleExchange,
  SaleExchangePaymentMethod,
  SaleExchangeSource,
} from "@/types/saleExchange";

export type ExchangeSourceItem = {
  id: string;
  productId?: number | null;
  productSku?: string | null;
  productName: string;
  variantColor?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
};

type SaleExchangeModalProps = {
  sourceType: SaleExchangeSource;
  saleId: string;
  saleNumber: string;
  items: ExchangeSourceItem[];
  exchanges: SaleExchange[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

function getShortSku(value?: string | null) {
  return value?.startsWith("AIV-") ? value.slice(4) : value || "-";
}

function getNumericPrice(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function formatPriceInput(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString("es-AR");
}

function getProductDefaultPrice(
  product: Product,
  sourceType: SaleExchangeSource
) {
  return sourceType === "web"
    ? getEffectiveWebUnitPrice(product, "unit")
    : getRetailPrice(product);
}

export function SaleExchangeHistory({
  exchanges,
}: {
  exchanges: SaleExchange[];
}) {
  if (exchanges.length === 0) return null;

  return (
    <section className="mt-3 border-t border-zinc-800 pt-3">
      <div className="mb-2 flex items-center gap-2">
        <Repeat2 size={15} className="text-sky-300" />
        <h3 className="text-xs font-black uppercase text-zinc-400">
          Cambios realizados ({exchanges.length})
        </h3>
      </div>

      <div className="grid gap-2">
        {exchanges.map((exchange) => (
          <article
            key={exchange.id}
            className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-zinc-200">
                <span className="font-bold">
                  {exchange.quantity}x {exchange.returnedProductName}
                </span>
                <span className="text-zinc-500">
                  {exchange.returnedVariantColor} / {exchange.returnedSize}
                </span>
                <ArrowRight size={14} className="text-sky-300" />
                <span className="font-bold">
                  {exchange.quantity}x {exchange.replacementProductName}
                </span>
                <span className="text-zinc-500">
                  {exchange.replacementVariantColor} / {exchange.replacementSize}
                </span>
              </div>
              {exchange.note && (
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {exchange.note}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <span
                className={`rounded-lg px-2 py-1 text-xs font-bold ${
                  exchange.differenceTotal > 0
                    ? "bg-amber-400/15 text-amber-200"
                    : "bg-emerald-400/15 text-emerald-200"
                }`}
              >
                {exchange.differenceTotal > 0
                  ? `Diferencia ${formatPrice(exchange.differenceTotal)}`
                  : "Sin diferencia"}
              </span>
              <time className="whitespace-nowrap text-xs text-zinc-500">
                {new Date(exchange.createdAt).toLocaleString("es-AR")}
              </time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function SaleExchangeModal({
  sourceType,
  saleId,
  saleNumber,
  items,
  exchanges,
  onClose,
  onSaved,
}: SaleExchangeModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedSourceItemId, setSelectedSourceItemId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [replacementPriceInput, setReplacementPriceInput] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<SaleExchangePaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const exchangedByItem = useMemo(() => {
    const totals = new Map<string, number>();

    exchanges.forEach((exchange) => {
      totals.set(
        exchange.sourceItemId,
        (totals.get(exchange.sourceItemId) ?? 0) + exchange.quantity
      );
    });

    return totals;
  }, [exchanges]);

  const sourceItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        remaining:
          item.quantity - (exchangedByItem.get(item.id) ?? 0),
      })),
    [exchangedByItem, items]
  );

  const selectedSourceItem =
    sourceItems.find((item) => item.id === selectedSourceItemId) ?? null;
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;
  const selectedVariant =
    selectedProduct?.variants.find(
      (variant) => variant.color === selectedColor
    ) ?? null;
  const selectedSizeRow =
    selectedVariant?.sizes.find((size) => size.size === selectedSize) ?? null;
  const replacementUnitPrice = getNumericPrice(replacementPriceInput);
  const originalUnitPrice = selectedSourceItem?.unitPrice ?? 0;
  const differencePerUnit = replacementUnitPrice - originalUnitPrice;
  const differenceTotal = Math.max(0, differencePerUnit * quantity);
  const isSameVariant = Boolean(
    selectedSourceItem &&
      selectedProduct &&
      selectedSourceItem.productId === selectedProduct.id &&
      selectedSourceItem.variantColor === selectedColor &&
      selectedSourceItem.size === selectedSize
  );
  const replacementStock =
    (selectedSizeRow?.stock ?? 0) +
    (isSameVariant ? selectedSourceItem?.remaining ?? 0 : 0);
  const maxQuantity = Math.max(
    0,
    Math.min(selectedSourceItem?.remaining ?? 0, replacementStock)
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!normalizedSearch) return true;

        return [product.name, product.sku, product.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .slice(0, 8);
  }, [productSearch, products]);

  const selectReplacementProduct = (
    product: Product,
    sourceItem = selectedSourceItem
  ) => {
    const preferredVariant =
      product.variants.find(
        (variant) =>
          variant.color === sourceItem?.variantColor &&
          variant.sizes.some(
            (size) =>
              size.stock > 0 ||
              (product.id === sourceItem?.productId &&
                size.size === sourceItem.size)
          )
      ) ??
      product.variants.find((variant) =>
        variant.sizes.some((size) => size.stock > 0)
      ) ??
      product.variants[0];
    const preferredSize =
      preferredVariant?.sizes.find(
        (size) =>
          size.size === sourceItem?.size &&
          (size.stock > 0 || product.id === sourceItem?.productId)
      ) ?? preferredVariant?.sizes.find((size) => size.stock > 0);
    const defaultPrice =
      product.id === sourceItem?.productId
        ? sourceItem.unitPrice
        : getProductDefaultPrice(product, sourceType);

    setSelectedProductId(product.id);
    setSelectedColor(preferredVariant?.color ?? "");
    setSelectedSize(preferredSize?.size ?? "");
    setReplacementPriceInput(formatPriceInput(defaultPrice));
    setProductSearch(product.name);
    setIsProductListOpen(false);
    setQuantity(1);
    setError("");
  };

  const selectSourceItem = (itemId: string, availableProducts = products) => {
    const item = sourceItems.find((currentItem) => currentItem.id === itemId);

    if (!item || item.remaining <= 0) return;

    setSelectedSourceItemId(item.id);
    setQuantity(1);
    setError("");

    const sameProduct = availableProducts.find(
      (product) => product.id === item.productId
    );

    if (sameProduct) {
      selectReplacementProduct(sameProduct, item);
      return;
    }

    setSelectedProductId(null);
    setSelectedColor("");
    setSelectedSize("");
    setProductSearch("");
    setReplacementPriceInput(formatPriceInput(item.unitPrice));
  };

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      setIsLoadingProducts(true);

      try {
        const nextProducts = (await getProducts({ includeInactive: true }))
          .filter((product) => !product.archivedAt)
          .sort((first, second) => second.id - first.id);

        if (!isCurrent) return;

        setProducts(nextProducts);

        const firstAvailableItem = sourceItems.find(
          (item) => item.remaining > 0 && item.productId
        );

        if (firstAvailableItem) {
          selectSourceItem(firstAvailableItem.id, nextProducts);
        }
      } catch (loadError) {
        if (!isCurrent) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el inventario."
        );
      } finally {
        if (isCurrent) setIsLoadingProducts(false);
      }
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
    // The modal is mounted fresh for each sale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const canSave = Boolean(
    selectedSourceItem &&
      selectedProduct &&
      selectedColor &&
      selectedSize &&
      quantity > 0 &&
      quantity <= maxQuantity &&
      replacementUnitPrice >= originalUnitPrice &&
      !isSaving
  );

  const handleSave = async () => {
    if (!canSave || !selectedSourceItem || !selectedProduct) return;

    setIsSaving(true);
    setError("");

    try {
      await createSaleExchange({
        sourceType,
        saleId,
        sourceItemId: selectedSourceItem.id,
        replacementProductId: selectedProduct.id,
        replacementVariantColor: selectedColor,
        replacementSize: selectedSize,
        quantity,
        replacementUnitPrice,
        paymentMethod: differenceTotal > 0 ? paymentMethod : null,
        note,
      });

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo registrar el cambio."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase text-sky-300">
              Venta {saleNumber}
            </p>
            <h2 className="mt-0.5 text-xl font-black text-white">
              Registrar cambio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar cambio"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase text-zinc-400">
                  1. Prenda que vuelve
                </h3>
                <span className="text-xs text-zinc-600">
                  Valor pagado
                </span>
              </div>

              <div className="grid max-h-[330px] gap-2 overflow-y-auto pr-1">
                {sourceItems.map((item) => {
                  const isSelected = item.id === selectedSourceItemId;
                  const isUnavailable = item.remaining <= 0 || !item.productId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectSourceItem(item.id)}
                      disabled={isUnavailable}
                      className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        isSelected
                          ? "border-sky-400 bg-sky-400/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">
                          {item.productName}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                          <span>SKU {getShortSku(item.productSku)}</span>
                          <span>/</span>
                          <span>{item.variantColor || "-"}</span>
                          <span>Talle {item.size || "-"}</span>
                          <span>/</span>
                          <span>
                            {item.remaining > 0
                              ? `${item.remaining} disponible${item.remaining === 1 ? "" : "s"}`
                              : "Ya cambiado"}
                          </span>
                        </span>
                      </span>
                      <strong className="whitespace-nowrap text-sm text-zinc-200">
                        {formatPrice(item.unitPrice)}
                      </strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-black uppercase text-zinc-400">
                2. Prenda de reemplazo
              </h3>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="search"
                  value={productSearch}
                  onFocus={() => setIsProductListOpen(true)}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setIsProductListOpen(true);
                  }}
                  placeholder="Buscar producto o SKU"
                  className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm font-semibold text-white outline-none transition focus:border-sky-400"
                />

                {isProductListOpen && (
                  <div className="absolute left-0 right-0 top-[46px] z-20 max-h-56 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-1 shadow-2xl">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => selectReplacementProduct(product)}
                          className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-zinc-800"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">
                              {product.name}
                            </span>
                            <span className="text-xs text-zinc-500">
                              SKU {getShortSku(product.sku)}
                            </span>
                          </span>
                          <span className="text-xs font-bold text-zinc-400">
                            Stock {product.stock ?? 0}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-center text-sm text-zinc-500">
                        No hay coincidencias.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-white">
                        {selectedProduct.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        SKU {getShortSku(selectedProduct.sku)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsProductListOpen(true)}
                      className="h-8 cursor-pointer rounded-lg bg-zinc-800 px-3 text-xs font-bold text-zinc-300 transition hover:bg-zinc-700"
                    >
                      Cambiar producto
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-zinc-500">
                        Color
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedProduct.variants.map((variant) => {
                          const hasStock = variant.sizes.some(
                            (size) =>
                              size.stock > 0 ||
                              (selectedSourceItem?.productId ===
                                selectedProduct.id &&
                                selectedSourceItem.variantColor ===
                                  variant.color &&
                                selectedSourceItem.size === size.size)
                          );

                          return (
                            <button
                              key={variant.color}
                              type="button"
                              onClick={() => {
                                const firstSize = variant.sizes.find(
                                  (size) => size.stock > 0
                                );
                                setSelectedColor(variant.color);
                                setSelectedSize(firstSize?.size ?? "");
                                setQuantity(1);
                              }}
                              disabled={!hasStock}
                              className={`h-9 cursor-pointer rounded-lg border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                                selectedColor === variant.color
                                  ? "border-sky-400 bg-sky-400/15 text-sky-100"
                                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                              }`}
                            >
                              {variant.color}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase text-zinc-500">
                        Talle
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedVariant?.sizes.map((size) => {
                          const returnedStock =
                            selectedSourceItem?.productId === selectedProduct.id &&
                            selectedSourceItem.variantColor === selectedColor &&
                            selectedSourceItem.size === size.size
                              ? selectedSourceItem.remaining
                              : 0;
                          const available = size.stock + returnedStock;

                          return (
                            <button
                              key={size.size}
                              type="button"
                              onClick={() => {
                                setSelectedSize(size.size);
                                setQuantity(1);
                              }}
                              disabled={available <= 0}
                              title={
                                available > 0
                                  ? `${available} disponibles para el cambio`
                                  : "Sin stock"
                              }
                              className={`min-w-10 cursor-pointer rounded-lg border px-2 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                selectedSize === size.size
                                  ? "border-sky-400 bg-sky-400/15 text-sky-100"
                                  : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                              }`}
                            >
                              {size.size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 border-t border-zinc-800 pt-3 sm:grid-cols-[auto_1fr] sm:items-end">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-zinc-500">
                        Cantidad
                      </span>
                      <div className="mt-1 flex h-10 w-fit items-center rounded-lg border border-zinc-700 bg-zinc-950">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((current) => Math.max(1, current - 1))
                          }
                          disabled={quantity <= 1}
                          className="flex h-full w-10 cursor-pointer items-center justify-center text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Restar cantidad"
                        >
                          <Minus size={15} />
                        </button>
                        <strong className="w-10 text-center text-sm text-white">
                          {quantity}
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((current) =>
                              Math.min(maxQuantity, current + 1)
                            )
                          }
                          disabled={quantity >= maxQuantity}
                          className="flex h-full w-10 cursor-pointer items-center justify-center text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Sumar cantidad"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 sm:pb-2">
                      Stock de reemplazo: {replacementStock} / Maximo: {maxQuantity}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-500">
                Valor pagado por unidad
              </label>
              <div className="mt-1 flex h-11 items-center rounded-xl bg-zinc-900 px-3 text-sm font-bold text-zinc-300">
                {formatPrice(originalUnitPrice)}
              </div>
            </div>

            <div>
              <label
                htmlFor="replacement-price"
                className="text-[11px] font-bold uppercase text-zinc-500"
              >
                Valor del reemplazo
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                  $
                </span>
                <input
                  id="replacement-price"
                  type="text"
                  inputMode="numeric"
                  value={replacementPriceInput}
                  onChange={(event) =>
                    setReplacementPriceInput(
                      formatPriceInput(getNumericPrice(event.target.value))
                    )
                  }
                  className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-7 pr-3 text-sm font-black text-white outline-none transition focus:border-sky-400"
                />
              </div>
            </div>

            <div className="min-w-[190px] rounded-xl bg-zinc-900 px-3 py-2">
              <span className="block text-[11px] font-bold uppercase text-zinc-500">
                Diferencia a cobrar
              </span>
              <strong
                className={`mt-0.5 block text-xl ${
                  differencePerUnit < 0 ? "text-red-300" : "text-white"
                }`}
              >
                {differencePerUnit < 0
                  ? "No permitido"
                  : formatPrice(differenceTotal)}
              </strong>
            </div>
          </section>

          {differenceTotal > 0 && differencePerUnit >= 0 && (
            <section className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2">
              <Banknote size={16} className="text-amber-200" />
              <span className="mr-2 text-xs font-bold uppercase text-amber-100">
                Cobro de diferencia
              </span>
              {(
                [
                  ["cash", "Efectivo"],
                  ["transfer", "Transferencia"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-bold transition ${
                    paymentMethod === value
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </section>
          )}

          <div className="mt-3">
            <label
              htmlFor="exchange-note"
              className="text-[11px] font-bold uppercase text-zinc-500"
            >
              Nota opcional
            </label>
            <input
              id="exchange-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej: cambio de talle"
              maxLength={180}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-sky-400"
            />
          </div>

          {differencePerUnit < 0 && (
            <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200">
              El reemplazo debe ser del mismo valor o superior. No se realizan
              devoluciones de dinero por cambios comunes.
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200">
              {error}
            </p>
          )}
        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 cursor-pointer rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || isLoadingProducts}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={17} />
            {isSaving ? "Registrando..." : "Confirmar cambio"}
          </button>
        </footer>
      </div>
    </div>
  );
}
