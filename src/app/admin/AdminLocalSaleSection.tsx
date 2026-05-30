"use client";

import {
  CheckCircle,
  History,
  CreditCard,
  Minus,
  NotebookPen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { fallbackProductImage } from "@/config/store";
import {
  cancelLocalSale,
  createLocalSale,
  createLocalSaleNumber,
  deleteLocalSale,
  getLocalSales,
} from "@/lib/localSales";
import { formatPrice, getRetailPrice } from "@/lib/pricing";
import { getVariantSizeStock } from "@/lib/stock";
import type {
  LocalSale,
  LocalSaleItemInput,
  LocalSalePaymentMethod,
} from "@/types/localSale";
import type { StoreCategory } from "@/types/category";
import type { Product, ProductVariant } from "@/types/product";

type Props = {
  products: Product[];
  categories: StoreCategory[];
  onSaleCreated: () => Promise<void> | void;
};

type LocalSaleCartItem = LocalSaleItemInput & {
  key: string;
};

type CompletedLocalSale = {
  saleNumber: string;
  paymentMethod: LocalSalePaymentMethod;
  total: number;
  items: LocalSaleCartItem[];
};

type LocalSaleTab = "new" | "history";
type LocalSaleStatusFilter = "all" | "completed" | "cancelled";
type LocalSalePaymentFilter = "all" | LocalSalePaymentMethod;

const paymentMethods: Array<{
  label: string;
  value: LocalSalePaymentMethod;
}> = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
  { label: "Mixto", value: "mixed" },
];

function getShortSku(sku?: string) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku || "";
}

function getVariantStock(variant?: ProductVariant) {
  return (
    variant?.sizes.reduce((total, size) => total + size.stock, 0) ??
    0
  );
}

function getFirstAvailableVariant(product?: Product) {
  return (
    product?.variants.find((variant) => getVariantStock(variant) > 0) ||
    product?.variants[0] ||
    null
  );
}

function getFirstAvailableSize(variant?: ProductVariant | null) {
  return (
    variant?.sizes.find((size) => size.stock > 0)?.size ||
    variant?.sizes[0]?.size ||
    ""
  );
}

function getItemKey(
  productId: number,
  color: string,
  size: string
) {
  return [productId, color, size].join("|");
}

export default function AdminLocalSaleSection({
  products,
  categories,
  onSaleCreated,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] =
    useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] =
    useState<LocalSalePaymentMethod>("cash");
  const [internalNotes, setInternalNotes] = useState("");
  const [cartItems, setCartItems] = useState<LocalSaleCartItem[]>([]);
  const [activeTab, setActiveTab] = useState<LocalSaleTab>("new");
  const [localSales, setLocalSales] = useState<LocalSale[]>([]);
  const [localSaleSearch, setLocalSaleSearch] = useState("");
  const [localSaleStatusFilter, setLocalSaleStatusFilter] =
    useState<LocalSaleStatusFilter>("all");
  const [localSalePaymentFilter, setLocalSalePaymentFilter] =
    useState<LocalSalePaymentFilter>("all");
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [cancellingSaleId, setCancellingSaleId] = useState("");
  const [deletingSaleId, setDeletingSaleId] = useState("");
  const [saleError, setSaleError] = useState("");
  const [saleMessage, setSaleMessage] = useState("");
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [productListCategory, setProductListCategory] = useState("all");
  const [completedSale, setCompletedSale] =
    useState<CompletedLocalSale | null>(null);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products]
  );
  const productsById = useMemo(
    () =>
      new Map(
        activeProducts.map((product) => [
          product.id,
          product,
        ])
      ),
    [activeProducts]
  );
  const categoryLabels = useMemo(
    () =>
      new Map(
        categories.map((category) => [category.value, category.label])
      ),
    [categories]
  );
  const listProducts = useMemo(
    () =>
      activeProducts
        .filter(
          (product) =>
            productListCategory === "all" ||
            product.category === productListCategory
        )
        .sort((first, second) => {
          const categoryOrder =
            (categoryLabels.get(first.category) ?? first.category).localeCompare(
              categoryLabels.get(second.category) ?? second.category,
              "es"
            );

          return categoryOrder || first.name.localeCompare(second.name, "es");
        }),
    [activeProducts, categoryLabels, productListCategory]
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    const filteredProducts = normalizedSearch
      ? activeProducts.filter((product) => {
          const shortSku = getShortSku(product.sku).toLowerCase();

          return [
            product.name,
            product.slug,
            product.category,
            product.sku ?? "",
            shortSku,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        })
      : activeProducts;

    return filteredProducts.slice(0, 6);
  }, [activeProducts, normalizedSearch]);
  const selectedProduct =
    activeProducts.find((product) => product.id === selectedProductId) ||
    null;
  const fallbackVariant = getFirstAvailableVariant(
    selectedProduct ?? undefined
  );
  const effectiveColor = selectedProduct?.variants.some(
    (variant) => variant.color === selectedColor
  )
    ? selectedColor
    : fallbackVariant?.color ?? "";
  const selectedVariant =
    selectedProduct?.variants.find(
      (variant) => variant.color === effectiveColor
    ) ||
    getFirstAvailableVariant(selectedProduct ?? undefined) ||
    null;
  const fallbackSize = getFirstAvailableSize(selectedVariant);
  const effectiveSize = selectedVariant?.sizes.some(
    (size) => size.size === selectedSize
  )
    ? selectedSize
    : fallbackSize;
  const selectedSizeData =
    selectedVariant?.sizes.find((size) => size.size === effectiveSize) ||
    null;
  const selectedKey =
    selectedProduct && selectedVariant && effectiveSize
      ? getItemKey(selectedProduct.id, selectedVariant.color, effectiveSize)
      : "";
  const quantityAlreadyInCart = cartItems
    .filter((item) => item.key === selectedKey)
    .reduce((total, item) => total + item.quantity, 0);
  const availableToAdd = Math.max(
    (selectedSizeData?.stock ?? 0) - quantityAlreadyInCart,
    0
  );
  const safeQuantity = Math.min(
    Math.max(quantity, 1),
    availableToAdd > 0 ? availableToAdd : 1
  );
  const total = cartItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const paymentLabel =
    paymentMethods.find((method) => method.value === paymentMethod)
      ?.label ?? "Sin elegir";
  const visibleLocalSales = useMemo(() => {
    const normalizedSaleSearch = localSaleSearch.trim().toLowerCase();

    return localSales.filter((sale) => {
      const matchesStatus =
        localSaleStatusFilter === "all" ||
        sale.status === localSaleStatusFilter;
      const matchesPayment =
        localSalePaymentFilter === "all" ||
        sale.paymentMethod === localSalePaymentFilter;
      const matchesSearch =
        normalizedSaleSearch.length === 0 ||
        [
          sale.saleNumber,
          sale.internalNotes ?? "",
          ...sale.items.flatMap((item) => [
            item.productName,
            item.productSku ?? "",
            item.variantColor,
            item.size,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSaleSearch);

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [
    localSales,
    localSalePaymentFilter,
    localSaleSearch,
    localSaleStatusFilter,
  ]);
  const hasLocalSaleFilters =
    localSaleSearch.trim().length > 0 ||
    localSaleStatusFilter !== "all" ||
    localSalePaymentFilter !== "all";

  const refreshLocalSales = async () => {
    setIsLoadingSales(true);

    try {
      const sales = await getLocalSales();

      setLocalSales(sales);
    } catch (error) {
      setSaleError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las ventas locales."
      );
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refreshLocalSales();
    });
  }, []);

  const handleSelectProduct = (product: Product) => {
    const variant = getFirstAvailableVariant(product);

    setSelectedProductId(product.id);
    setSearchQuery(product.name);
    setSelectedColor(variant?.color ?? "");
    setSelectedSize(getFirstAvailableSize(variant));
    setQuantity(1);
    setSaleError("");
    setSaleMessage("");
    setIsProductListOpen(false);
  };

  const updateCartQuantity = (key: string, nextQuantity: number) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) => {
          if (item.key !== key) return item;

          const product = productsById.get(item.productId);
          const stockLimit = getVariantSizeStock({
            variants: product?.variants,
            color: item.variantColor,
            size: item.size,
          });
          const safeNextQuantity = Math.min(
            Math.max(nextQuantity, 0),
            stockLimit
          );

          return {
            ...item,
            quantity: safeNextQuantity,
            subtotal: item.unitPrice * safeNextQuantity,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const addSelectedProduct = () => {
    setSaleError("");
    setSaleMessage("");

    if (!selectedProduct || !selectedVariant || !selectedSizeData) {
      setSaleError("Selecciona producto, color y talle.");
      return;
    }

    if (availableToAdd <= 0) {
      setSaleError("No hay stock disponible para esa combinacion.");
      return;
    }

    const nextQuantity = Math.min(safeQuantity, availableToAdd);
    const unitPrice = getRetailPrice(selectedProduct);
    const itemKey = getItemKey(
      selectedProduct.id,
      selectedVariant.color,
      selectedSizeData.size
    );

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.key === itemKey
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.key === itemKey
            ? {
                ...item,
                quantity: item.quantity + nextQuantity,
                subtotal: item.unitPrice * (item.quantity + nextQuantity),
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          key: itemKey,
          productId: selectedProduct.id,
          productSlug: selectedProduct.slug,
          productSku: selectedProduct.sku,
          productName: selectedProduct.name,
          variantColor: selectedVariant.color,
          size: selectedSizeData.size,
          quantity: nextQuantity,
          unitPrice,
          subtotal: unitPrice * nextQuantity,
          imageUrl:
            selectedVariant.images[0] ||
            selectedProduct.images[0] ||
            "",
        },
      ];
    });

    setQuantity(1);
  };

  const confirmSale = async () => {
    if (cartItems.length === 0 || isSavingSale) return;

    setSaleError("");
    setSaleMessage("");
    setIsSavingSale(true);

    try {
      const sale = await createLocalSale({
        saleNumber: createLocalSaleNumber(),
        paymentMethod,
        total,
        internalNotes,
        items: cartItems,
      });

      setCompletedSale({
        saleNumber: sale.saleNumber,
        paymentMethod,
        total,
        items: cartItems,
      });
      setCartItems([]);
      setInternalNotes("");
      setSelectedProductId(null);
      setSearchQuery("");
      setSelectedColor("");
      setSelectedSize("");
      setQuantity(1);
      setIsProductListOpen(false);
      await onSaleCreated();
      await refreshLocalSales();
    } catch (error) {
      setSaleError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la venta local."
      );
    } finally {
      setIsSavingSale(false);
    }
  };

  const startNewSale = () => {
    setCompletedSale(null);
    setSaleError("");
    setSaleMessage("");
    setPaymentMethod("cash");
  };

  const handleCancelSale = async (sale: LocalSale) => {
    if (cancellingSaleId) return;

    const shouldCancel = window.confirm(
      `Anular ${sale.saleNumber}? Se devolvera el stock.`
    );

    if (!shouldCancel) return;

    setSaleError("");
    setSaleMessage("");
    setCancellingSaleId(sale.id);

    try {
      await cancelLocalSale(sale);
      setSaleMessage(`Venta ${sale.saleNumber} anulada.`);
      await onSaleCreated();
      await refreshLocalSales();
    } catch (error) {
      setSaleError(
        error instanceof Error
          ? error.message
          : "No se pudo anular la venta local."
      );
    } finally {
      setCancellingSaleId("");
    }
  };

  const handleDeleteSale = async (sale: LocalSale) => {
    if (deletingSaleId || cancellingSaleId) return;

    const stockWarning =
      sale.status === "completed"
        ? " Esta accion no devuelve stock; usa Anular si necesitas reponerlo."
        : "";
    const shouldDelete = window.confirm(
      `Eliminar ${sale.saleNumber} del historial?${stockWarning}`
    );

    if (!shouldDelete) return;

    setSaleError("");
    setSaleMessage("");
    setDeletingSaleId(sale.id);

    try {
      await deleteLocalSale(sale.id);
      setLocalSales((currentSales) =>
        currentSales.filter((currentSale) => currentSale.id !== sale.id)
      );
      setSaleMessage(`Venta ${sale.saleNumber} eliminada del historial.`);
    } catch (error) {
      setSaleError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la venta local."
      );
    } finally {
      setDeletingSaleId("");
    }
  };

  return (
    <section className="grid gap-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Venta en local
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Busca por SKU, arma el ticket y confirma la venta presencial.
            </p>
          </div>

          <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Funcional
          </span>
        </div>
      </div>

      <div className="flex w-full flex-wrap rounded-2xl bg-zinc-950 p-1 md:w-fit">
        {[
          ["new", "Nueva venta"],
          ["history", "Historial"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value as LocalSaleTab)}
            className={`h-10 flex-1 rounded-xl px-4 text-sm font-semibold transition cursor-pointer md:flex-none ${
              activeTab === value
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "new" && completedSale && (
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-emerald-500/30 bg-zinc-950 p-5 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <CheckCircle
              size={42}
              className="text-emerald-300"
            />

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Venta registrada
            </p>

            <h3 className="mt-2 text-2xl font-bold text-white">
              {completedSale.saleNumber}
            </h3>

            <p className="mt-3 text-4xl font-black text-white">
              {formatPrice(completedSale.total)}
            </p>

            <span className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300">
              {paymentMethods.find(
                (method) => method.value === completedSale.paymentMethod
              )?.label ?? completedSale.paymentMethod}
            </span>
          </div>

          <div className="mt-6 grid gap-2">
            {completedSale.items.map((item) => (
              <div
                key={item.key}
                className="flex flex-col gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-zinc-300">
                  {item.productName} - {item.variantColor} / {item.size} - x{item.quantity}
                </p>

                <p className="font-semibold text-white">
                  {formatPrice(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startNewSale}
              className="h-12 flex-1 rounded-xl bg-emerald-400 font-semibold text-black transition hover:bg-emerald-300 cursor-pointer"
            >
              Nueva venta
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className="h-12 flex-1 rounded-xl border border-zinc-700 font-semibold text-zinc-200 transition hover:bg-zinc-900 cursor-pointer"
            >
              Ver historial
            </button>
          </div>
        </section>
      )}

      {activeTab === "new" && !completedSale && (
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <Search
                  size={20}
                  className="text-emerald-300"
                />

                <h3 className="font-semibold">
                  Buscar producto
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsProductListOpen(true)}
                className="h-9 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 cursor-pointer"
              >
                Lista de productos
              </button>
            </div>

            <div className="relative z-20">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedProductId(null);
                }}
                placeholder="SKU o nombre del producto"
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-11 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500"
              />

              {normalizedSearch.length > 0 &&
                selectedProduct?.name.toLowerCase() !== normalizedSearch && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
                    {searchResults.length === 0 && (
                      <p className="px-3 py-5 text-center text-sm text-zinc-500">
                        No hay productos para esa busqueda.
                      </p>
                    )}

                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-zinc-900 cursor-pointer"
                      >
                        <span>
                          <span className="block text-xs font-bold text-emerald-200">
                            SKU {getShortSku(product.sku)}
                          </span>
                          <span className="mt-0.5 block text-sm font-semibold text-white">
                            {product.name}
                          </span>
                        </span>

                        <span className="text-xs font-semibold text-zinc-500">
                          {categoryLabels.get(product.category) ?? product.category}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {selectedProduct && (
              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="min-w-48 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Producto elegido
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedProduct.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-emerald-200">
                      SKU {getShortSku(selectedProduct.sku)}
                    </p>
                  </div>

                  <div className="grid flex-[2] gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Color
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map((variant) => (
                          <button
                            key={variant.color}
                            type="button"
                            onClick={() => {
                              setSelectedColor(variant.color);
                              setSelectedSize(getFirstAvailableSize(variant));
                              setQuantity(1);
                            }}
                            disabled={getVariantStock(variant) <= 0}
                            className={`h-8 rounded-full px-3 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${
                              effectiveColor === variant.color
                                ? "bg-white text-black"
                                : "bg-zinc-950 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {variant.color}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Talle
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVariant?.sizes.map((size) => (
                          <button
                            key={size.size}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size.size);
                              setQuantity(1);
                            }}
                            disabled={size.stock <= 0}
                            className={`h-8 min-w-8 rounded-lg px-3 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${
                              effectiveSize === size.size
                                ? "bg-white text-black"
                                : "bg-zinc-950 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {size.size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-60 grid-cols-[1fr_120px] gap-2">
                    <div className="flex h-11 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-500">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => Math.max(current - 1, 1))
                        }
                        className="transition hover:text-white cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="font-semibold text-zinc-300">
                        {safeQuantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            Math.min(current + 1, availableToAdd || 1)
                          )
                        }
                        disabled={availableToAdd <= safeQuantity}
                        className="transition hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={addSelectedProduct}
                      disabled={availableToAdd <= 0}
                      className="h-11 rounded-xl bg-emerald-400 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-zinc-500">
                  Disponible para agregar: {availableToAdd}
                </p>
              </div>
            )}

            <div className="mt-3">
              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.06] p-3 shadow-sm shadow-emerald-950/30">
                <div className="flex items-center justify-between border-b border-emerald-500/20 px-3 pb-3 pt-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                      Ticket actual
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      Productos de esta venta
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {cartItems.length} items
                  </span>
                </div>

                {cartItems.length > 0 && (
                  <div className="mt-3 hidden grid-cols-[1.8fr_.55fr_.75fr_.75fr_44px] gap-4 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:grid">
                    <p>Producto</p>
                    <p>Precio</p>
                    <p>Cantidad</p>
                    <p>Subtotal</p>
                    <div />
                  </div>
                )}

                <div className="mt-3 grid gap-3">
                  {cartItems.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-emerald-500/20 bg-zinc-950/80 px-3 py-10 text-center text-sm text-zinc-500">
                      Los productos que agregues a la venta aparecen aca.
                    </p>
                  )}

                  {cartItems.map((item) => (
                    <div
                      key={item.key}
                      className="relative grid grid-cols-1 items-center gap-4 rounded-2xl border border-emerald-500/15 bg-zinc-950 p-3 transition hover:border-emerald-500/35 lg:grid-cols-[1.8fr_.55fr_.75fr_.75fr_44px] lg:gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={item.imageUrl || fallbackProductImage}
                          alt={item.productName}
                          width={88}
                          height={88}
                          className="h-20 w-20 rounded-2xl bg-zinc-900 object-cover"
                        />

                        <div>
                          <p className="text-sm font-semibold text-zinc-200">
                            {item.productName}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-emerald-200">
                            SKU {getShortSku(item.productSku)}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-400">
                            <span className="rounded-full bg-zinc-900 px-3 py-1">
                              {item.variantColor}
                            </span>
                            <span className="rounded-full bg-zinc-900 px-3 py-1">
                              Talle {item.size}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-xs font-semibold uppercase text-zinc-500 lg:hidden">
                          Precio
                        </span>

                        <p className="text-sm font-semibold text-white">
                          {formatPrice(item.unitPrice)}
                        </p>
                      </div>

                      <div>
                        <div className="flex w-fit items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.key, item.quantity - 1)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>

                          <span className="min-w-5 text-center text-sm font-semibold text-white">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.key, item.quantity + 1)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-xs font-semibold uppercase text-zinc-500 lg:hidden">
                          Subtotal
                        </span>

                        <p className="text-base font-bold text-white">
                          {formatPrice(item.subtotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCartItems((currentItems) =>
                            currentItems.filter(
                              (currentItem) => currentItem.key !== item.key
                            )
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center gap-3">
              <NotebookPen
                size={20}
                className="text-emerald-300"
              />

              <h3 className="font-semibold">
                Nota interna
              </h3>
            </div>

            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Ej: pago parcial, cambio de talle..."
              className="min-h-20 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500"
            />
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Total a cobrar
              </p>

              <CreditCard
                size={18}
                className="text-emerald-200"
              />
            </div>

            <p className="mt-2 text-6xl font-black tracking-normal text-white">
              {formatPrice(total)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`h-8 rounded-full border px-3 text-xs font-semibold transition cursor-pointer ${
                    method.value === paymentMethod
                      ? "border-white bg-white text-black"
                      : "border-emerald-300/30 bg-emerald-950/30 text-emerald-100 hover:bg-emerald-900/50"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs leading-5 text-emerald-100/70">
              El detalle de recibido, vuelto o restante aparece al confirmar.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
              <span>Metodo</span>
              <span className="font-semibold text-zinc-200">
                {paymentLabel}
              </span>
            </div>

            {saleError && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {saleError}
              </p>
            )}

            {saleMessage && (
              <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {saleMessage}
              </p>
            )}

            <button
              type="button"
              onClick={confirmSale}
              disabled={cartItems.length === 0 || isSavingSale}
              className="mt-5 h-12 w-full rounded-xl bg-emerald-400 font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingSale ? "Confirmando..." : "Confirmar venta"}
            </button>
          </div>
        </aside>
      </div>
      )}

      {isProductListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">
                  Lista de productos
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Toca un producto para seleccionarlo y agregarlo al ticket.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsProductListOpen(false)}
                className="h-9 rounded-full border border-zinc-800 px-4 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <label className="mb-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Categoria
              </span>

              <select
                value={productListCategory}
                onChange={(event) => setProductListCategory(event.target.value)}
                className="h-11 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-zinc-600"
              >
                <option value="all">Todas las categorias</option>
                {categories
                  .filter((category) => category.active)
                  .sort((first, second) => first.sortOrder - second.sortOrder)
                  .map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
              </select>
            </label>

            <div className="max-h-[560px] overflow-y-auto pr-1">
              <div className="grid gap-2">
                {listProducts.length === 0 && (
                  <p className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-500">
                    No hay productos en esta categoria.
                  </p>
                )}

                {listProducts.map((product) => {
                  const totalStock = product.variants.reduce(
                    (total, variant) => total + getVariantStock(variant),
                    0
                  );
                  const availableVariants = product.variants.filter(
                    (variant) => getVariantStock(variant) > 0
                  );

                  return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="grid min-h-14 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition hover:border-zinc-600 hover:bg-zinc-800 cursor-pointer md:grid-cols-[minmax(180px,1fr)_140px_minmax(230px,1.3fr)_82px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-xs font-bold text-emerald-200">
                        SKU {getShortSku(product.sku)}
                      </span>
                    </span>

                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-center text-xs font-semibold text-zinc-500">
                      {categoryLabels.get(product.category) ?? product.category}
                    </span>

                    <span className="flex min-w-0 flex-wrap gap-1.5">
                      {availableVariants.map((variant) => (
                        <span
                          key={variant.color}
                          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-300"
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-zinc-700"
                            style={{
                              backgroundColor: variant.hex || "#000000",
                            }}
                          />
                          {variant.color} ({getVariantStock(variant)})
                        </span>
                      ))}

                      {availableVariants.length === 0 && (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                          Sin stock
                        </span>
                      )}
                    </span>

                    <span className="text-right text-xs font-semibold text-zinc-300">
                      Stock {totalStock}
                    </span>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <History
                size={20}
                className="text-emerald-300"
              />

              <h3 className="font-semibold">
                Historial de venta local
              </h3>
            </div>

            <button
              type="button"
              onClick={refreshLocalSales}
              disabled={isLoadingSales}
              className="h-10 rounded-xl border border-zinc-800 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingSales ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {saleError && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {saleError}
            </p>
          )}

          {saleMessage && (
            <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {saleMessage}
            </p>
          )}

          <div className="mb-4 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 lg:grid-cols-[minmax(240px,1fr)_170px_180px_auto] lg:items-end">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Buscar
              </span>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  type="search"
                  value={localSaleSearch}
                  onChange={(event) => setLocalSaleSearch(event.target.value)}
                  placeholder="Venta, SKU o producto"
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                />
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Estado
              </span>

              <select
                value={localSaleStatusFilter}
                onChange={(event) =>
                  setLocalSaleStatusFilter(
                    event.target.value as LocalSaleStatusFilter
                  )
                }
                className="h-11 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-zinc-600"
              >
                <option value="all">Todos</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Anuladas</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Medio de pago
              </span>

              <select
                value={localSalePaymentFilter}
                onChange={(event) =>
                  setLocalSalePaymentFilter(
                    event.target.value as LocalSalePaymentFilter
                  )
                }
                className="h-11 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-zinc-600"
              >
                <option value="all">Todos</option>
                {paymentMethods.map((method) => (
                  <option
                    key={method.value}
                    value={method.value}
                  >
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            {hasLocalSaleFilters && (
              <button
                type="button"
                onClick={() => {
                  setLocalSaleSearch("");
                  setLocalSaleStatusFilter("all");
                  setLocalSalePaymentFilter("all");
                }}
                className="h-11 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {localSales.length === 0 && !isLoadingSales && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
              Todavia no hay ventas locales.
            </p>
          )}

          {localSales.length > 0 &&
            visibleLocalSales.length === 0 &&
            !isLoadingSales && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
                No hay ventas que coincidan con los filtros.
              </p>
            )}

          <div className="grid gap-3">
            {visibleLocalSales.map((sale) => {
              const paymentMethodLabel =
                paymentMethods.find(
                  (method) => method.value === sale.paymentMethod
                )?.label ?? sale.paymentMethod;
              const isCancelled = sale.status === "cancelled";

              return (
                <article
                  key={sale.id}
                  className={`rounded-2xl border p-4 ${
                    isCancelled
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">
                          {sale.saleNumber}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isCancelled
                              ? "bg-red-500/15 text-red-200"
                              : "bg-emerald-500/15 text-emerald-200"
                          }`}
                        >
                          {isCancelled ? "Anulada" : "Completada"}
                        </span>

                        <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-400">
                          {paymentMethodLabel}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        {new Date(sale.createdAt).toLocaleString("es-AR")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-bold text-white">
                        {formatPrice(sale.total)}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleCancelSale(sale)}
                        disabled={
                          isCancelled ||
                          cancellingSaleId === sale.id ||
                          deletingSaleId === sale.id
                        }
                        className="h-10 rounded-xl border border-red-500/30 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {cancellingSaleId === sale.id
                          ? "Anulando..."
                          : "Anular"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSale(sale)}
                        disabled={
                          deletingSaleId === sale.id ||
                          cancellingSaleId === sale.id
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Eliminar ${sale.saleNumber}`}
                        title="Eliminar del historial"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {sale.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-zinc-300">
                          {item.productName} · SKU {getShortSku(item.productSku)} · {item.variantColor} / {item.size} · x{item.quantity}
                        </span>

                        <span className="font-semibold text-white">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {sale.internalNotes && (
                    <p className="mt-3 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-400">
                      Nota: {sale.internalNotes}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
