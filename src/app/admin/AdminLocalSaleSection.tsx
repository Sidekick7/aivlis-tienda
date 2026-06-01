"use client";

import {
  Banknote,
  CheckCircle,
  Copy,
  History,
  CreditCard,
  ListChecks,
  Minus,
  NotebookPen,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
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
import {
  formatPrice,
  getRetailPrice,
  getWholesalePrice,
  wholesaleMinimum,
} from "@/lib/pricing";
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
  paymentDetails: LocalSalePaymentDetails;
  pricingLabel: string;
  total: number;
  items: LocalSaleCartItem[];
};

type LocalSalePaymentDetails = {
  cashAmount: number;
  transferAmount: number;
  paidTotal: number;
  change: number;
  remaining: number;
};

type LocalSaleTab = "new" | "history" | "summary";
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

function parseMoneyInput(value: string) {
  const parsedValue = Number(value.replace(",", "."));

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function getMoneyInputValue(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function escapeReceiptHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyLocalSalePricing(
  items: LocalSaleCartItem[],
  productsById: Map<number, Product>,
  isWholesale: boolean
) {
  return items.map((item) => {
    const product = productsById.get(item.productId);
    const unitPrice = product
      ? isWholesale
        ? getWholesalePrice(product)
        : getRetailPrice(product)
      : item.unitPrice;

    return {
      ...item,
      unitPrice,
      subtotal: unitPrice * item.quantity,
    };
  });
}

function isSameLocalDay(dateValue: string, date: Date) {
  const saleDate = new Date(dateValue);

  return saleDate.toLocaleDateString("es-AR") === date.toLocaleDateString("es-AR");
}

function getPaymentAmountFromNotes(
  notes: string | null | undefined,
  label: "Efectivo" | "Transferencia"
) {
  const match = notes?.match(new RegExp(`${label}\\s+\\$([\\d.]+)`, "i"));

  if (!match?.[1]) return 0;

  return Number(match[1].replaceAll(".", "")) || 0;
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiptMessage, setReceiptMessage] = useState("");
  const [forceWholesalePrice, setForceWholesalePrice] = useState(false);
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
  const cartQuantityByVariant = useMemo(() => {
    const quantityByVariant = new Map<string, number>();

    for (const item of cartItems) {
      quantityByVariant.set(
        item.key,
        (quantityByVariant.get(item.key) ?? 0) + item.quantity
      );
    }

    return quantityByVariant;
  }, [cartItems]);
  const quantityAlreadyInCart =
    cartQuantityByVariant.get(selectedKey) ?? 0;
  const availableToAdd = Math.max(
    (selectedSizeData?.stock ?? 0) - quantityAlreadyInCart,
    0
  );
  const safeQuantity = Math.min(
    Math.max(quantity, 1),
    availableToAdd > 0 ? availableToAdd : 1
  );
  const wholesaleSubtotal = cartItems.reduce((sum, item) => {
    const product = productsById.get(item.productId);

    return (
      sum +
      (product ? getWholesalePrice(product) : item.unitPrice) *
        item.quantity
    );
  }, 0);
  const retailSubtotal = cartItems.reduce((sum, item) => {
    const product = productsById.get(item.productId);

    return (
      sum +
      (product ? getRetailPrice(product) : item.unitPrice) *
        item.quantity
    );
  }, 0);
  const isWholesaleAutomatic = wholesaleSubtotal >= wholesaleMinimum;
  const isWholesaleApplied =
    cartItems.length > 0 &&
    (isWholesaleAutomatic || forceWholesalePrice);
  const pricedCartItems = useMemo(
    () =>
      applyLocalSalePricing(
        cartItems,
        productsById,
        isWholesaleApplied
      ),
    [cartItems, isWholesaleApplied, productsById]
  );
  const total = pricedCartItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const remainingForWholesale = Math.max(
    wholesaleMinimum - wholesaleSubtotal,
    0
  );
  const wholesaleSavings = Math.max(retailSubtotal - wholesaleSubtotal, 0);
  const paymentLabel =
    paymentMethods.find((method) => method.value === paymentMethod)
      ?.label ?? "Sin elegir";
  const paymentDetails = useMemo<LocalSalePaymentDetails>(() => {
    const cashValue =
      paymentMethod === "cash" || paymentMethod === "mixed"
        ? parseMoneyInput(cashAmount)
        : 0;
    const transferValue =
      paymentMethod === "transfer" || paymentMethod === "mixed"
        ? parseMoneyInput(transferAmount)
        : 0;
    const paidTotal = cashValue + transferValue;

    return {
      cashAmount: cashValue,
      transferAmount: transferValue,
      paidTotal,
      change: Math.max(paidTotal - total, 0),
      remaining: Math.max(total - paidTotal, 0),
    };
  }, [cashAmount, paymentMethod, total, transferAmount]);
  const isPaymentComplete =
    cartItems.length > 0 && paymentDetails.paidTotal >= total;
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
  const dailySummary = useMemo(() => {
    const today = new Date();
    const todaySales = localSales.filter((sale) =>
      isSameLocalDay(sale.createdAt, today)
    );
    const completedSales = todaySales.filter(
      (sale) => sale.status === "completed"
    );
    const cancelledSales = todaySales.filter(
      (sale) => sale.status === "cancelled"
    );

    const cashTotal = completedSales.reduce((sum, sale) => {
      if (sale.paymentMethod === "cash") return sum + sale.total;
      if (sale.paymentMethod === "mixed") {
        return sum + getPaymentAmountFromNotes(sale.internalNotes, "Efectivo");
      }

      return sum;
    }, 0);
    const transferTotal = completedSales.reduce((sum, sale) => {
      if (sale.paymentMethod === "transfer") return sum + sale.total;
      if (sale.paymentMethod === "mixed") {
        return (
          sum +
          getPaymentAmountFromNotes(sale.internalNotes, "Transferencia")
        );
      }

      return sum;
    }, 0);
    const mixedWithoutDetailTotal = completedSales.reduce((sum, sale) => {
      if (sale.paymentMethod !== "mixed") return sum;

      const mixedCash = getPaymentAmountFromNotes(
        sale.internalNotes,
        "Efectivo"
      );
      const mixedTransfer = getPaymentAmountFromNotes(
        sale.internalNotes,
        "Transferencia"
      );

      return mixedCash + mixedTransfer > 0 ? sum : sum + sale.total;
    }, 0);
    const soldTotal = completedSales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );
    const itemCount = completedSales.reduce(
      (sum, sale) =>
        sum +
        sale.items.reduce(
          (itemSum, item) => itemSum + item.quantity,
          0
        ),
      0
    );

    return {
      dateLabel: today.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      completedCount: completedSales.length,
      cancelledCount: cancelledSales.length,
      soldTotal,
      cashTotal,
      transferTotal,
      mixedWithoutDetailTotal,
      itemCount,
      averageTicket:
        completedSales.length > 0 ? soldTotal / completedSales.length : 0,
      latestSales: completedSales.slice(0, 5),
    };
  }, [localSales]);

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
    setCartItems((currentItems) => {
      const updatedItems = currentItems
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
        .filter((item) => item.quantity > 0);
      const updatedWholesaleSubtotal = updatedItems.reduce((sum, item) => {
        const product = productsById.get(item.productId);

        return (
          sum +
          (product ? getWholesalePrice(product) : item.unitPrice) *
            item.quantity
        );
      }, 0);
      const shouldUseWholesale =
        forceWholesalePrice ||
        updatedWholesaleSubtotal >= wholesaleMinimum;

      return applyLocalSalePricing(
        updatedItems,
        productsById,
        shouldUseWholesale
      );
    });
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
    const unitPrice = isWholesaleApplied
      ? getWholesalePrice(selectedProduct)
      : getRetailPrice(selectedProduct);
    const itemKey = getItemKey(
      selectedProduct.id,
      selectedVariant.color,
      selectedSizeData.size
    );

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.key === itemKey
      );
      let updatedItems: LocalSaleCartItem[];

      if (existingItem) {
        updatedItems = currentItems.map((item) =>
          item.key === itemKey
            ? {
                ...item,
                quantity: item.quantity + nextQuantity,
                subtotal: item.unitPrice * (item.quantity + nextQuantity),
              }
            : item
        );
      } else {
        updatedItems = [
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
      }

      const updatedWholesaleSubtotal = updatedItems.reduce((sum, item) => {
        const product = productsById.get(item.productId);

        return (
          sum +
          (product ? getWholesalePrice(product) : item.unitPrice) *
            item.quantity
        );
      }, 0);
      const shouldUseWholesale =
        forceWholesalePrice ||
        updatedWholesaleSubtotal >= wholesaleMinimum;

      return applyLocalSalePricing(
        updatedItems,
        productsById,
        shouldUseWholesale
      );
    });

    setQuantity(1);
  };

  const preparePaymentFields = (method: LocalSalePaymentMethod) => {
    if (method === "cash") {
      setCashAmount(getMoneyInputValue(total));
      setTransferAmount("");
      return;
    }

    if (method === "transfer") {
      setCashAmount("");
      setTransferAmount(getMoneyInputValue(total));
      return;
    }

    setCashAmount("");
    setTransferAmount("");
  };

  const handlePaymentMethodChange = (method: LocalSalePaymentMethod) => {
    setPaymentMethod(method);
    preparePaymentFields(method);
  };

  const openConfirmModal = () => {
    if (cartItems.length === 0 || isSavingSale) return;

    setSaleError("");
    setSaleMessage("");
    setReceiptMessage("");
    preparePaymentFields(paymentMethod);
    setIsConfirmModalOpen(true);
  };

  const toggleForceWholesalePrice = () => {
    setForceWholesalePrice((currentValue) => {
      const nextValue = !currentValue;
      const shouldUseWholesale = nextValue || isWholesaleAutomatic;

      setCartItems((currentItems) =>
        applyLocalSalePricing(
          currentItems,
          productsById,
          shouldUseWholesale
        )
      );

      return nextValue;
    });
  };

  const removeCartItem = (key: string) => {
    setCartItems((currentItems) => {
      const updatedItems = currentItems.filter(
        (currentItem) => currentItem.key !== key
      );
      const updatedWholesaleSubtotal = updatedItems.reduce((sum, item) => {
        const product = productsById.get(item.productId);

        return (
          sum +
          (product ? getWholesalePrice(product) : item.unitPrice) *
            item.quantity
        );
      }, 0);
      const shouldUseWholesale =
        forceWholesalePrice ||
        updatedWholesaleSubtotal >= wholesaleMinimum;

      return applyLocalSalePricing(
        updatedItems,
        productsById,
        shouldUseWholesale
      );
    });
  };

  const buildPaymentNote = (details: LocalSalePaymentDetails) => {
    const parts = [
      `Pago local: ${paymentLabel}`,
      isWholesaleApplied
        ? forceWholesalePrice && !isWholesaleAutomatic
          ? "Lista: mayorista manual"
          : "Lista: mayorista automatica"
        : "Lista: minorista",
      details.cashAmount > 0
        ? `Efectivo ${formatPrice(details.cashAmount)}`
        : "",
      details.transferAmount > 0
        ? `Transferencia ${formatPrice(details.transferAmount)}`
        : "",
      details.change > 0 ? `Vuelto ${formatPrice(details.change)}` : "",
    ].filter(Boolean);

    return parts.join(" | ");
  };

  const buildReceiptText = (sale: CompletedLocalSale) => {
    const methodLabel =
      paymentMethods.find((method) => method.value === sale.paymentMethod)
        ?.label ?? sale.paymentMethod;
    const lines = [
      "AIVLIS - Venta local",
      `Ticket: ${sale.saleNumber}`,
      `Fecha: ${new Date().toLocaleString("es-AR")}`,
      `Lista: ${sale.pricingLabel}`,
      "",
      ...sale.items.map(
        (item) =>
          `${item.productName} - SKU ${getShortSku(item.productSku)} - ${item.variantColor} / ${item.size} - x${item.quantity} - ${formatPrice(item.subtotal)}`
      ),
      "",
      `Total: ${formatPrice(sale.total)}`,
      `Pago: ${methodLabel}`,
      sale.paymentDetails.cashAmount > 0
        ? `Efectivo: ${formatPrice(sale.paymentDetails.cashAmount)}`
        : "",
      sale.paymentDetails.transferAmount > 0
        ? `Transferencia: ${formatPrice(sale.paymentDetails.transferAmount)}`
        : "",
      sale.paymentDetails.change > 0
        ? `Vuelto: ${formatPrice(sale.paymentDetails.change)}`
        : "",
    ].filter((line) => line !== "");

    return lines.join("\n");
  };

  const copyCompletedSaleReceipt = async () => {
    if (!completedSale) return;

    try {
      await navigator.clipboard.writeText(buildReceiptText(completedSale));
      setReceiptMessage("Resumen copiado.");
    } catch {
      setReceiptMessage("No se pudo copiar el resumen.");
    }
  };

  const printCompletedSaleReceipt = () => {
    if (!completedSale) return;

    const receiptText = buildReceiptText(completedSale);
    const printWindow = window.open("", "_blank", "width=420,height=640");

    if (!printWindow) {
      setReceiptMessage("No se pudo abrir la ventana de impresion.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeReceiptHtml(completedSale.saleNumber)}</title>
          <style>
            body {
              color: #111;
              font-family: Arial, sans-serif;
              margin: 24px;
            }

            pre {
              font-size: 14px;
              line-height: 1.45;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <pre>${escapeReceiptHtml(receiptText)}</pre>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setReceiptMessage("Recibo listo para imprimir.");
  };

  const confirmSale = async () => {
    if (cartItems.length === 0 || isSavingSale) return;

    if (!isPaymentComplete) {
      setSaleError(
        `Falta cobrar ${formatPrice(paymentDetails.remaining)}.`
      );
      return;
    }

    setSaleError("");
    setSaleMessage("");
    setIsSavingSale(true);

    try {
      const paymentNote = buildPaymentNote(paymentDetails);
      const saleNotes = [internalNotes.trim(), paymentNote]
        .filter(Boolean)
        .join("\n");
      const sale = await createLocalSale({
        saleNumber: createLocalSaleNumber(),
        paymentMethod,
        total,
        internalNotes: saleNotes,
        items: pricedCartItems,
      });

      setCompletedSale({
        saleNumber: sale.saleNumber,
        paymentMethod,
        paymentDetails,
        pricingLabel: isWholesaleApplied ? "Mayorista" : "Minorista",
        total,
        items: pricedCartItems,
      });
      setCartItems([]);
      setInternalNotes("");
      setSelectedProductId(null);
      setSearchQuery("");
      setSelectedColor("");
      setSelectedSize("");
      setQuantity(1);
      setIsProductListOpen(false);
      setIsConfirmModalOpen(false);
      setForceWholesalePrice(false);
      setCashAmount("");
      setTransferAmount("");
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
    setReceiptMessage("");
    setPaymentMethod("cash");
    setCashAmount("");
    setTransferAmount("");
    setForceWholesalePrice(false);
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
      <div className="flex w-full flex-wrap rounded-2xl bg-zinc-950 p-1 md:w-fit">
        {[
          ["new", "Nueva venta"],
          ["history", "Historial"],
          ["summary", "Resumen del dia"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value as LocalSaleTab)}
            className={`h-12 flex-1 rounded-xl px-6 text-base font-semibold transition cursor-pointer md:flex-none ${
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

            <span className="mt-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200">
              Lista {completedSale.pricingLabel}
            </span>

            <div className="mt-4 grid w-full max-w-md gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left text-sm text-zinc-300">
              {completedSale.paymentDetails.cashAmount > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Efectivo</span>
                  <span className="font-semibold text-white">
                    {formatPrice(completedSale.paymentDetails.cashAmount)}
                  </span>
                </div>
              )}

              {completedSale.paymentDetails.transferAmount > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Transferencia</span>
                  <span className="font-semibold text-white">
                    {formatPrice(completedSale.paymentDetails.transferAmount)}
                  </span>
                </div>
              )}

              {completedSale.paymentDetails.change > 0 && (
                <div className="flex justify-between gap-3 text-emerald-200">
                  <span>Vuelto</span>
                  <span className="font-semibold">
                    {formatPrice(completedSale.paymentDetails.change)}
                  </span>
                </div>
              )}
            </div>
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={startNewSale}
              className="h-16 rounded-2xl bg-emerald-400 text-xl font-black text-black transition hover:bg-emerald-300 cursor-pointer sm:col-span-3"
            >
              Nueva venta
            </button>

            <button
              type="button"
              onClick={copyCompletedSaleReceipt}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 font-semibold text-zinc-200 transition hover:bg-zinc-900 cursor-pointer"
            >
              <Copy size={17} />
              Copiar
            </button>

            <button
              type="button"
              onClick={printCompletedSaleReceipt}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 font-semibold text-zinc-200 transition hover:bg-zinc-900 cursor-pointer"
            >
              <Printer size={17} />
              Imprimir
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className="h-12 rounded-xl border border-zinc-700 font-semibold text-zinc-200 transition hover:bg-zinc-900 cursor-pointer"
            >
              Ver historial
            </button>
          </div>

          {receiptMessage && (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center text-sm font-semibold text-zinc-300">
              {receiptMessage}
            </p>
          )}
        </section>
      )}

      {activeTab === "new" && !completedSale && (
      <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <Search
                  size={22}
                  className="text-emerald-300"
                />

                <h3 className="text-xl font-semibold">
                  Buscar producto
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsProductListOpen(true)}
                className="h-10 rounded-full border border-zinc-700 bg-zinc-900 px-5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 cursor-pointer"
              >
                Lista de productos
              </button>
            </div>

            <div className="relative z-20">
              <Search
                size={20}
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
                className="h-14 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-12 text-base font-medium text-white outline-none placeholder:text-zinc-400 focus:border-zinc-400"
              />

              {normalizedSearch.length > 0 &&
                selectedProduct?.name.toLowerCase() !== normalizedSearch && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
                    {searchResults.length === 0 && (
                      <p className="px-3 py-5 text-center text-base text-zinc-400">
                        No hay productos para esa busqueda.
                      </p>
                    )}

                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-zinc-900 cursor-pointer"
                      >
                        <span>
                          <span className="block text-sm font-bold text-emerald-200">
                            SKU {getShortSku(product.sku)}
                          </span>
                          <span className="mt-0.5 block text-base font-semibold text-white">
                            {product.name}
                          </span>
                        </span>

                        <span className="text-sm font-semibold text-zinc-400">
                          {categoryLabels.get(product.category) ?? product.category}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {selectedProduct && (
              <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                      Producto elegido
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {selectedProduct.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-200">
                      SKU {getShortSku(selectedProduct.sku)}
                    </p>
                  </div>

                  <div className="grid flex-[2] gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
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
                            className={`h-10 rounded-full px-4 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${
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
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
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
                            className={`h-10 min-w-10 rounded-lg px-4 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${
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
                    <div className="flex h-12 items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-400">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => Math.max(current - 1, 1))
                        }
                        className="transition hover:text-white cursor-pointer"
                      >
                          <Minus size={16} />
                      </button>

                      <span className="font-semibold text-white">
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
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={addSelectedProduct}
                      disabled={availableToAdd <= 0}
                      className="h-12 rounded-xl bg-emerald-400 text-base font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm font-medium text-zinc-300">
                  Disponible para agregar: {availableToAdd}
                </p>

                <div className="mt-4 grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Disponible por color
                  </p>

                  <div className="grid gap-2 lg:grid-cols-2">
                    {selectedProduct.variants.map((variant) => {
                      const availableBySize = variant.sizes.map((size) => {
                        const sizeKey = getItemKey(
                          selectedProduct.id,
                          variant.color,
                          size.size
                        );
                        const quantityInTicket =
                          cartQuantityByVariant.get(sizeKey) ?? 0;

                        return {
                          size: size.size,
                          available: Math.max(
                            size.stock - quantityInTicket,
                            0
                          ),
                        };
                      });
                      const availableByColor = availableBySize.reduce(
                        (sum, size) => sum + size.available,
                        0
                      );

                      return (
                        <button
                          key={variant.color}
                          type="button"
                          onClick={() => {
                            if (availableByColor <= 0) return;

                            setSelectedColor(variant.color);
                            setSelectedSize(getFirstAvailableSize(variant));
                            setQuantity(1);
                          }}
                          disabled={availableByColor <= 0}
                          className={`rounded-xl border p-3 text-left transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
                            effectiveColor === variant.color
                              ? "border-emerald-400 bg-emerald-500/10"
                              : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-zinc-700"
                                style={{
                                  backgroundColor:
                                    variant.hex || "#000000",
                                }}
                              />
                              <span className="truncate text-sm font-bold text-white">
                                {variant.color}
                              </span>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                availableByColor > 0
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-red-500/10 text-red-300"
                              }`}
                            >
                              {availableByColor}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {availableBySize.map((size) => (
                              <span
                                key={size.size}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                  size.available <= 0
                                    ? "bg-red-500/10 text-red-300"
                                    : size.available <= 3
                                      ? "bg-amber-400/10 text-amber-200"
                                      : "bg-zinc-950 text-zinc-200"
                                }`}
                              >
                                {size.size}: {size.available}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.08] p-4 shadow-sm shadow-emerald-950/30">
                <div className="flex items-center justify-between border-b border-emerald-500/20 px-3 pb-4 pt-2">
                  <div>
                    <p className="text-base font-semibold uppercase tracking-wide text-emerald-300">
                      Ticket actual
                    </p>

                    <p className="mt-1 text-sm text-zinc-300">
                      Productos de esta venta
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-200">
                    {pricedCartItems.length} items
                  </span>
                </div>

                {pricedCartItems.length > 0 && (
                  <div className="mt-4 hidden grid-cols-[1.8fr_.55fr_.75fr_.75fr_44px] gap-4 px-2 text-sm font-semibold uppercase tracking-wide text-zinc-400 lg:grid">
                    <p>Producto</p>
                    <p>Precio</p>
                    <p>Cantidad</p>
                    <p>Subtotal</p>
                    <div />
                  </div>
                )}

                <div className="mt-3 grid gap-3">
                  {pricedCartItems.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-emerald-500/20 bg-zinc-950/80 px-3 py-12 text-center text-base text-zinc-400">
                      Los productos que agregues a la venta aparecen aca.
                    </p>
                  )}

                  {pricedCartItems.map((item) => (
                    <div
                      key={item.key}
                      className="relative grid grid-cols-1 items-center gap-4 rounded-2xl border border-emerald-500/15 bg-zinc-950 p-4 transition hover:border-emerald-500/35 lg:grid-cols-[1.8fr_.55fr_.75fr_.75fr_44px] lg:gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={item.imageUrl || fallbackProductImage}
                          alt={item.productName}
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-2xl bg-zinc-900 object-cover"
                        />

                        <div>
                          <p className="text-base font-semibold text-white">
                            {item.productName}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-emerald-200">
                            SKU {getShortSku(item.productSku)}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-zinc-300">
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
                        <span className="text-sm font-semibold uppercase text-zinc-400 lg:hidden">
                          Precio
                        </span>

                        <p className="text-base font-semibold text-white">
                          {formatPrice(item.unitPrice)}
                        </p>
                      </div>

                      <div>
                        <div className="flex w-fit items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.key, item.quantity - 1)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
                          >
                            <Minus size={16} />
                          </button>

                          <span className="min-w-6 text-center text-base font-semibold text-white">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.key, item.quantity + 1)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-sm font-semibold uppercase text-zinc-400 lg:hidden">
                          Subtotal
                        </span>

                        <p className="text-lg font-bold text-white">
                          {formatPrice(item.subtotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartItem(item.key)}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 flex items-center gap-3">
              <NotebookPen
                size={20}
                className="text-emerald-300"
              />

              <h3 className="text-xl font-semibold">
                Nota interna
              </h3>
            </div>

            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Ej: pago parcial, cambio de talle..."
              className="min-h-24 w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-base text-white outline-none placeholder:text-zinc-400 focus:border-zinc-500"
            />
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                Total a cobrar
              </p>

              <CreditCard
                size={18}
                className="text-emerald-200"
              />
            </div>

            <p className="mt-3 text-6xl font-black tracking-normal text-white">
              {formatPrice(total)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handlePaymentMethodChange(method.value)}
                  className={`h-10 rounded-full border px-4 text-sm font-semibold transition cursor-pointer ${
                    method.value === paymentMethod
                      ? "border-white bg-white text-black"
                      : "border-emerald-300/30 bg-emerald-950/30 text-emerald-100 hover:bg-emerald-900/50"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-zinc-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                    Lista de precio
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {isWholesaleApplied ? "Mayorista" : "Minorista"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleForceWholesalePrice}
                  disabled={cartItems.length === 0 || isWholesaleAutomatic}
                  className={`h-10 rounded-full border px-4 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    forceWholesalePrice
                      ? "border-white bg-white text-black"
                      : "border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  Forzar mayorista
                </button>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{
                    width: `${Math.min(
                      (wholesaleSubtotal / wholesaleMinimum) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm font-medium text-emerald-100/80">
                {isWholesaleApplied
                  ? `Precio mayorista aplicado. Ahorras ${formatPrice(
                      wholesaleSavings
                    )}.`
                  : `Faltan ${formatPrice(
                      remainingForWholesale
                    )} para mayorista.`}
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-emerald-100/80">
              El detalle de recibido, vuelto o restante aparece al confirmar.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-4 text-base text-zinc-300">
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
              onClick={openConfirmModal}
              disabled={cartItems.length === 0 || isSavingSale}
              className="mt-5 h-14 w-full rounded-xl bg-emerald-400 text-lg font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revisar y cobrar
            </button>
          </div>
        </aside>
      </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Confirmar cobro
                </p>
                <h3 className="mt-2 text-3xl font-black text-white">
                  {formatPrice(total)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:bg-zinc-900 hover:text-white cursor-pointer"
                aria-label="Cerrar confirmacion"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handlePaymentMethodChange(method.value)}
                  className={`h-11 rounded-full border px-5 text-base font-semibold transition cursor-pointer ${
                    method.value === paymentMethod
                      ? "border-white bg-white text-black"
                      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(paymentMethod === "cash" || paymentMethod === "mixed") && (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Efectivo recibido
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={cashAmount}
                    onChange={(event) => setCashAmount(event.target.value)}
                    className="h-14 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-xl font-bold text-white outline-none focus:border-zinc-500"
                    placeholder="0"
                  />
                </label>
              )}

              {(paymentMethod === "transfer" || paymentMethod === "mixed") && (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Transferencia
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                    className="h-14 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-xl font-bold text-white outline-none focus:border-zinc-500"
                    placeholder="0"
                  />
                </label>
              )}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-base">
              <div className="flex justify-between gap-3 text-zinc-300">
                <span>Recibido</span>
                <span className="font-bold text-white">
                  {formatPrice(paymentDetails.paidTotal)}
                </span>
              </div>

              {paymentDetails.remaining > 0 && (
                <div className="flex justify-between gap-3 text-red-200">
                  <span>Falta</span>
                  <span className="font-bold">
                    {formatPrice(paymentDetails.remaining)}
                  </span>
                </div>
              )}

              {paymentDetails.change > 0 && (
                <div className="flex justify-between gap-3 text-emerald-200">
                  <span>Vuelto</span>
                  <span className="font-bold">
                    {formatPrice(paymentDetails.change)}
                  </span>
                </div>
              )}

              {isPaymentComplete && paymentDetails.change === 0 && (
                <div className="flex justify-between gap-3 text-emerald-200">
                  <span>Estado</span>
                  <span className="font-bold">Pago exacto</span>
                </div>
              )}
            </div>

            {saleError && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {saleError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="h-12 flex-1 rounded-xl border border-zinc-700 px-5 text-base font-semibold text-zinc-200 transition hover:bg-zinc-900 cursor-pointer"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={confirmSale}
                disabled={!isPaymentComplete || isSavingSale}
                className="h-12 flex-[2] rounded-xl bg-emerald-400 px-5 text-lg font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingSale ? "Registrando..." : "Cobrar y registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProductListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-5xl rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Lista de productos
                </h3>
                <p className="mt-1 text-sm text-zinc-300">
                  Toca un producto para seleccionarlo y agregarlo al ticket.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsProductListOpen(false)}
                className="h-10 rounded-full border border-zinc-700 px-5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <label className="mb-4 grid gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Categoria
              </span>

              <select
                value={productListCategory}
                onChange={(event) => setProductListCategory(event.target.value)}
                className="h-12 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white outline-none transition focus:border-zinc-600"
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
                  <p className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-base text-zinc-400">
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
                    className="grid min-h-16 items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-500 hover:bg-zinc-800 cursor-pointer md:grid-cols-[minmax(220px,1fr)_160px_minmax(260px,1.4fr)_100px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-white">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-sm font-bold text-emerald-200">
                        SKU {getShortSku(product.sku)}
                      </span>
                    </span>

                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-center text-sm font-semibold text-zinc-300">
                      {categoryLabels.get(product.category) ?? product.category}
                    </span>

                    <span className="flex min-w-0 flex-wrap gap-1.5">
                      {availableVariants.map((variant) => (
                        <span
                          key={variant.color}
                          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-2.5 py-1 text-sm font-semibold text-zinc-200"
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

                    <span className="text-right text-sm font-semibold text-zinc-200">
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

      {activeTab === "summary" && (
        <section className="grid gap-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Banknote
                  size={22}
                  className="text-emerald-300"
                />

                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Resumen del dia
                  </h3>
                  <p className="mt-1 text-base text-zinc-400">
                    {dailySummary.dateLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={refreshLocalSales}
                disabled={isLoadingSales}
                className="h-11 rounded-xl border border-zinc-700 px-5 text-base font-semibold text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isLoadingSales ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                Total vendido hoy
              </p>
              <p className="mt-3 text-6xl font-black text-white">
                {formatPrice(dailySummary.soldTotal)}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-950/70 p-4">
                  <p className="text-sm font-semibold text-zinc-400">
                    Ventas
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {dailySummary.completedCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-950/70 p-4">
                  <p className="text-sm font-semibold text-zinc-400">
                    Productos
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {dailySummary.itemCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-950/70 p-4">
                  <p className="text-sm font-semibold text-zinc-400">
                    Ticket prom.
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {formatPrice(dailySummary.averageTicket)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Medios de pago
                </p>

                <div className="mt-4 grid gap-3 text-base">
                  <div className="flex justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3">
                    <span className="font-semibold text-zinc-300">
                      Efectivo
                    </span>
                    <span className="font-bold text-white">
                      {formatPrice(dailySummary.cashTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3">
                    <span className="font-semibold text-zinc-300">
                      Transferencia
                    </span>
                    <span className="font-bold text-white">
                      {formatPrice(dailySummary.transferTotal)}
                    </span>
                  </div>

                  {dailySummary.mixedWithoutDetailTotal > 0 && (
                    <div className="flex justify-between gap-3 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3">
                      <span className="font-semibold text-yellow-100">
                        Mixto sin detalle
                      </span>
                      <span className="font-bold text-yellow-100">
                        {formatPrice(dailySummary.mixedWithoutDetailTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Anuladas hoy
                </p>
                <p className="mt-2 text-4xl font-black text-white">
                  {dailySummary.cancelledCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex items-center gap-3">
              <ListChecks
                size={20}
                className="text-emerald-300"
              />
              <h3 className="text-xl font-semibold text-white">
                Ultimas ventas de hoy
              </h3>
            </div>

            {dailySummary.latestSales.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-8 text-center text-base text-zinc-400">
                Todavia no hay ventas completadas hoy.
              </p>
            ) : (
              <div className="grid gap-2">
                {dailySummary.latestSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="grid gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-base md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {sale.saleNumber}
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-400">
                        {new Date(sale.createdAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-sm font-semibold text-zinc-300">
                      {paymentMethods.find(
                        (method) => method.value === sale.paymentMethod
                      )?.label ?? sale.paymentMethod}
                    </span>

                    <p className="text-xl font-black text-white">
                      {formatPrice(sale.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "history" && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <History
                size={20}
                className="text-emerald-300"
              />

              <h3 className="text-xl font-semibold">
                Historial de venta local
              </h3>
            </div>

            <button
              type="button"
              onClick={refreshLocalSales}
              disabled={isLoadingSales}
              className="h-11 rounded-xl border border-zinc-700 px-5 text-base font-semibold text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="mb-4 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 lg:grid-cols-[minmax(260px,1fr)_180px_190px_auto] lg:items-end">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
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
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-3 text-base text-white outline-none placeholder:text-zinc-400 focus:border-zinc-600"
                />
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Estado
              </span>

              <select
                value={localSaleStatusFilter}
                onChange={(event) =>
                  setLocalSaleStatusFilter(
                    event.target.value as LocalSaleStatusFilter
                  )
                }
                className="h-12 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-white outline-none focus:border-zinc-600"
              >
                <option value="all">Todos</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Anuladas</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Medio de pago
              </span>

              <select
                value={localSalePaymentFilter}
                onChange={(event) =>
                  setLocalSalePaymentFilter(
                    event.target.value as LocalSalePaymentFilter
                  )
                }
                className="h-12 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-white outline-none focus:border-zinc-600"
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
                className="h-12 rounded-xl border border-zinc-700 px-4 text-base font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {localSales.length === 0 && !isLoadingSales && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-base text-zinc-400">
              Todavia no hay ventas locales.
            </p>
          )}

          {localSales.length > 0 &&
            visibleLocalSales.length === 0 &&
            !isLoadingSales && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-base text-zinc-400">
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
                        <p className="text-lg font-bold text-white">
                          {sale.saleNumber}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            isCancelled
                              ? "bg-red-500/15 text-red-200"
                              : "bg-emerald-500/15 text-emerald-200"
                          }`}
                        >
                          {isCancelled ? "Anulada" : "Completada"}
                        </span>

                        <span className="rounded-full bg-zinc-950 px-3 py-1 text-sm font-semibold text-zinc-300">
                          {paymentMethodLabel}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-zinc-400">
                        {new Date(sale.createdAt).toLocaleString("es-AR")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-3xl font-black text-white">
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
                        className="h-11 rounded-xl border border-red-500/30 px-5 text-base font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="flex flex-col gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-base sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium text-zinc-300">
                          {item.productName} · SKU {getShortSku(item.productSku)} · {item.variantColor} / {item.size} · x{item.quantity}
                        </span>

                        <span className="font-semibold text-white">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {sale.internalNotes && (
                    <p className="mt-3 rounded-xl bg-zinc-950 p-3 text-base text-zinc-300">
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
