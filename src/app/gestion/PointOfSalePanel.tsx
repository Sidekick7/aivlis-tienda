"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  List,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createLocalSale,
  createLocalSaleNumber,
} from "@/lib/localSales";
import { isCurveProduct } from "@/lib/curve";
import { groupSaleItems } from "@/lib/saleItemGroups";
import { getLocalSaleChargeBreakdown } from "@/lib/localSaleReceipt";
import { getProductImage } from "@/lib/productDisplay";
import { formatPrice, getRetailPrice } from "@/lib/pricing";
import { getVariantSizeStock } from "@/lib/stock";
import type {
  LocalSaleItemInput,
  LocalSalePaymentMethod,
} from "@/types/localSale";
import type { Product } from "@/types/product";

type Props = {
  products: Product[];
  isLoadingProducts: boolean;
  onSaleCreated: () => Promise<void> | void;
};

type PosTicketItem = LocalSaleItemInput & {
  key: string;
  adjustmentType: PosAdjustmentType;
  adjustmentValue: number;
};

type PosPriceList = "base" | "curve" | "retail";
type PosOperationType = "sale" | "reserve";

type PosAdjustmentType =
  | "none"
  | "discount-percent"
  | "discount-amount"
  | "surcharge-percent"
  | "surcharge-amount";

type PosTicketStorage = {
  ticketItems?: unknown;
  priceList?: unknown;
  paymentMethod?: unknown;
  cashAmount?: unknown;
  transferAmount?: unknown;
  shouldPrintReceipt?: unknown;
};

type NormalizedPosTicketStorage = {
  ticketItems: PosTicketItem[];
  priceList: PosPriceList;
  paymentMethod: LocalSalePaymentMethod;
  cashAmount: string;
  transferAmount: string;
  shouldPrintReceipt: boolean;
};

type PaymentDetails = {
  cashAmount: number;
  transferAmount: number;
  paidTotal: number;
  change: number;
  remaining: number;
};

const paymentMethods: Array<{
  label: string;
  value: LocalSalePaymentMethod;
}> = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
];

const priceLists: Array<{
  label: string;
  value: PosPriceList;
}> = [
  { label: "Mayorista", value: "base" },
  { label: "Curva", value: "curve" },
  { label: "Minorista", value: "retail" },
];

const operationTypes: Array<{
  label: string;
  value: PosOperationType;
}> = [
  { label: "Contado", value: "sale" },
  { label: "Reserva", value: "reserve" },
];

const transferSurchargeRate = 0.05;

const adjustmentOptions: Array<{
  label: string;
  value: PosAdjustmentType;
}> = [
  { label: "Sin ajuste", value: "none" },
  { label: "Descuento", value: "discount-amount" },
  { label: "Recargo", value: "surcharge-amount" },
];

const ticketGridColumns =
  "grid-cols-[34px_70px_minmax(120px,1fr)_82px_56px_104px_88px_92px_98px_36px]";
const posTicketStorageKey = "aivlis-pos-ticket";

function getShortSku(sku?: string | null) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku || "";
}

function getItemKey(productId: number, color: string, size: string) {
  return [productId, color, size].join("|");
}

function getVariantQuantityKey(color: string, size: string) {
  return [color, size].join("|");
}

function getShortSaleNumber(saleNumber: string) {
  return saleNumber.split("-").at(-1) || saleNumber;
}

function parseMoneyInput(value: string) {
  const parsedValue = Number(value.replace(/\D/g, ""));

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function getMoneyInputValue(amount: number) {
  return Math.round(amount).toLocaleString("es-AR");
}

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "";
  }

  return Number(digits).toLocaleString("es-AR");
}

function escapeReceiptText(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPaymentMethodLabel(method: LocalSalePaymentMethod) {
  return (
    paymentMethods.find((paymentMethod) => paymentMethod.value === method)
      ?.label ?? method
  );
}

function printLocalSaleReceipt({
  printWindow,
  saleNumber,
  paymentMethod,
  total,
  items,
}: {
  printWindow: Window | null;
  saleNumber: string;
  paymentMethod: LocalSalePaymentMethod;
  total: number;
  items: LocalSaleItemInput[];
}) {
  if (!printWindow) return;

  const { productsSubtotal, transferSurcharge } =
    getLocalSaleChargeBreakdown({ paymentMethod, total, items });
  const breakdownHtml =
    transferSurcharge > 0
      ? `
          <section class="summary">
            <div class="row">
              <span>Subtotal productos</span>
              <strong>${escapeReceiptText(formatPrice(productsSubtotal))}</strong>
            </div>
            <div class="row">
              <span>Transferencia 5%</span>
              <strong>${escapeReceiptText(formatPrice(transferSurcharge))}</strong>
            </div>
          </section>
        `
      : "";

  const shortSaleNumber = getShortSaleNumber(saleNumber);
  const createdAt = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const itemsHtml = groupSaleItems(items)
    .map((group) => {
      const skuText = getShortSku(group.productSku);
      const isCurveGroup = group.saleMode === "curve";
      const curveUnitPrice = group.items[0]?.unitPrice ?? 0;
      const curveSizes = Array.from(
        new Set(
          group.items
            .map((item) => item.size)
            .filter((size): size is string => Boolean(size))
        )
      );
      const curveColors = Array.from(
        new Set(
          group.items
            .map((item) => item.variantColor)
            .filter((color): color is string => Boolean(color))
        )
      );
      const totalGarments = group.items.reduce(
        (total, item) => total + item.quantity,
        0
      );
      const detailRows = isCurveGroup
        ? `
            <tr class="details-row">
              <td colspan="3">
                ${curveColors.length > 0 ? `<span>${escapeReceiptText(curveColors.join(", "))}</span>` : ""}
                <span>Talles: ${curveSizes.map((size) => escapeReceiptText(size)).join(" &middot; ")}</span>
                <span>${escapeReceiptText(totalGarments)} prendas &middot; ${escapeReceiptText(group.bundleQuantity)} de cada talle</span>
                <span>${escapeReceiptText(formatPrice(curveUnitPrice))} por prenda</span>
              </td>
            </tr>
            <tr class="amount-row">
              <td>${escapeReceiptText(group.bundleQuantity)} ${group.bundleQuantity === 1 ? "curva" : "curvas"}</td>
              <td>${escapeReceiptText(formatPrice(group.bundlePrice))}</td>
              <td>${escapeReceiptText(formatPrice(group.subtotal))}</td>
            </tr>
          `
        : group.items
            .map(
              (item) => `
                <tr class="details-row">
                  <td colspan="3">
                    <span>${escapeReceiptText(item.variantColor)} / Talle ${escapeReceiptText(item.size)}</span>
                  </td>
                </tr>
                <tr class="amount-row">
                  <td>${escapeReceiptText(item.quantity)} ${item.quantity === 1 ? "prenda" : "prendas"}</td>
                  <td>${escapeReceiptText(formatPrice(item.unitPrice))}</td>
                  <td>${escapeReceiptText(formatPrice(item.subtotal))}</td>
                </tr>
              `
            )
            .join("");

      return `
        <tr class="product-row">
          <td colspan="3">
            <strong>${escapeReceiptText(group.productName)}</strong>
            ${
              skuText
                ? `<span>SKU ${escapeReceiptText(skuText)}</span>`
                : ""
            }
          </td>
        </tr>
        ${detailRows}
      `;
    })
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Venta ${escapeReceiptText(shortSaleNumber)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #fff;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
          }
          .ticket {
            width: 80mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 12px;
          }
          .brand {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 2px;
            text-align: center;
          }
          .subtitle {
            margin-top: 3px;
            text-align: center;
            color: #555;
            font-size: 11px;
            text-transform: uppercase;
          }
          .meta {
            display: grid;
            gap: 4px;
            margin: 12px 0;
            padding: 10px 0;
            border-top: 1px dashed #999;
            border-bottom: 1px dashed #999;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }
          table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
          }
          th {
            border-bottom: 1px solid #222;
            padding: 5px 0;
            text-align: right;
            font-size: 10px;
            text-transform: uppercase;
          }
          th:first-child,
          td:first-child {
            text-align: left;
          }
          th:nth-child(1), td:nth-child(1) { width: 32%; }
          th:nth-child(2), td:nth-child(2) { width: 31%; }
          th:nth-child(3), td:nth-child(3) { width: 37%; }
          td {
            border-bottom: 1px solid #eee;
            padding: 7px 0;
            text-align: right;
            vertical-align: top;
          }
          td span {
            display: block;
            margin-top: 2px;
            color: #555;
            font-size: 10px;
          }
          .product-row td {
            border-bottom: 0;
            padding: 9px 0 3px;
          }
          .product-row strong {
            display: block;
            font-size: 12px;
          }
          .details-row td {
            border-bottom: 0;
            padding: 2px 0;
            text-align: left;
          }
          .details-row span {
            color: #111;
            font-size: 11px;
          }
          .amount-row td {
            padding: 5px 0 9px;
            font-weight: 700;
          }
          .amount-row td:nth-child(2),
          .amount-row td:nth-child(3) {
            text-align: right;
          }
          .summary {
            display: grid;
            gap: 5px;
            margin-top: 10px;
            padding-top: 9px;
            border-top: 1px dashed #999;
          }
          .total {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 2px solid #111;
            font-size: 16px;
            font-weight: 900;
          }
          .footer {
            margin-top: 14px;
            text-align: center;
            color: #555;
            font-size: 10px;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <main class="ticket">
          <div class="brand">AIVLIS</div>
          <div class="subtitle">Detalle de compra</div>

          <section class="meta">
            <div class="row">
              <span>Venta</span>
              <strong>#${escapeReceiptText(shortSaleNumber)}</strong>
            </div>
            <div class="row">
              <span>Fecha</span>
              <strong>${escapeReceiptText(createdAt)}</strong>
            </div>
            <div class="row">
              <span>Pago</span>
              <strong>${escapeReceiptText(getPaymentMethodLabel(paymentMethod))}</strong>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Cant.</th>
                <th>Valor</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          ${breakdownHtml}

          <section class="total">
            <span>Total</span>
            <span>${escapeReceiptText(formatPrice(total))}</span>
          </section>

          <p class="footer">Gracias por tu compra.</p>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function isPriceList(value: unknown): value is PosPriceList {
  return value === "base" || value === "curve" || value === "retail";
}

function isPaymentMethod(
  value: unknown
): value is LocalSalePaymentMethod {
  return value === "cash" || value === "transfer";
}

function isAdjustmentType(
  value: unknown
): value is PosAdjustmentType {
  return adjustmentOptions.some((option) => option.value === value);
}

function normalizeStoredTicketItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): PosTicketItem[] => {
    if (!item || typeof item !== "object") return [];

    const storedItem = item as Partial<PosTicketItem>;

    if (
      typeof storedItem.key !== "string" ||
      typeof storedItem.productId !== "number" ||
      typeof storedItem.productSlug !== "string" ||
      typeof storedItem.productName !== "string" ||
      typeof storedItem.variantColor !== "string" ||
      typeof storedItem.size !== "string" ||
      typeof storedItem.quantity !== "number" ||
      typeof storedItem.unitPrice !== "number" ||
      typeof storedItem.subtotal !== "number"
    ) {
      return [];
    }

    return [
      {
        key: storedItem.key,
        productId: storedItem.productId,
        productSlug: storedItem.productSlug,
        productSku: storedItem.productSku,
        productName: storedItem.productName,
        variantColor: storedItem.variantColor,
        size: storedItem.size,
        quantity: storedItem.quantity,
        unitPrice: storedItem.unitPrice,
        subtotal: storedItem.subtotal,
        adjustmentType: isAdjustmentType(storedItem.adjustmentType)
          ? storedItem.adjustmentType
          : "none",
        adjustmentValue:
          typeof storedItem.adjustmentValue === "number"
            ? storedItem.adjustmentValue
            : 0,
        imageUrl: storedItem.imageUrl,
        lineGroupId:
          typeof storedItem.lineGroupId === "string"
            ? storedItem.lineGroupId
            : crypto.randomUUID(),
        saleMode: storedItem.saleMode === "curve" ? "curve" : "unit",
        bundleQuantity:
          typeof storedItem.bundleQuantity === "number"
            ? storedItem.bundleQuantity
            : storedItem.quantity,
        unitsPerBundle:
          typeof storedItem.unitsPerBundle === "number"
            ? storedItem.unitsPerBundle
            : 1,
        bundlePrice:
          typeof storedItem.bundlePrice === "number"
            ? storedItem.bundlePrice
            : storedItem.unitPrice,
      },
    ];
  });
}

function getStoredPosTicket(): NormalizedPosTicketStorage {
  const fallbackTicket: NormalizedPosTicketStorage = {
    ticketItems: [],
    priceList: "base",
    paymentMethod: "cash",
    cashAmount: "",
    transferAmount: "",
    shouldPrintReceipt: false,
  };

  if (typeof window === "undefined") {
    return fallbackTicket;
  }

  try {
    const storedTicket = window.localStorage.getItem(posTicketStorageKey);

    if (!storedTicket) {
      return fallbackTicket;
    }

    const parsedTicket = JSON.parse(storedTicket) as PosTicketStorage;

    return {
      ticketItems: normalizeStoredTicketItems(parsedTicket.ticketItems),
      priceList: isPriceList(parsedTicket.priceList)
        ? parsedTicket.priceList
        : fallbackTicket.priceList,
      paymentMethod: isPaymentMethod(parsedTicket.paymentMethod)
        ? parsedTicket.paymentMethod
        : fallbackTicket.paymentMethod,
      cashAmount:
        typeof parsedTicket.cashAmount === "string"
          ? parsedTicket.cashAmount
          : fallbackTicket.cashAmount,
      transferAmount:
        typeof parsedTicket.transferAmount === "string"
          ? parsedTicket.transferAmount
          : fallbackTicket.transferAmount,
      shouldPrintReceipt:
        typeof parsedTicket.shouldPrintReceipt === "boolean"
          ? parsedTicket.shouldPrintReceipt
          : fallbackTicket.shouldPrintReceipt,
    };
  } catch {
    window.localStorage.removeItem(posTicketStorageKey);
    return fallbackTicket;
  }
}

function getPriceListLabel(priceList: PosPriceList) {
  return (
    priceLists.find((list) => list.value === priceList)?.label ??
    "Mayorista"
  );
}

function getProductUnitPrice(product: Product, priceList: PosPriceList) {
  if (priceList === "retail") return getRetailPrice(product);
  if (priceList === "curve") return product.curvePrice || product.price;

  return product.price;
}

function getAdjustedUnitPrice(item: PosTicketItem, baseUnitPrice: number) {
  const adjustmentValue = Number(item.adjustmentValue || 0);

  if (item.adjustmentType === "discount-percent") {
    return Math.max(0, Math.round(baseUnitPrice * (1 - adjustmentValue / 100)));
  }

  if (item.adjustmentType === "discount-amount") {
    return Math.max(0, Math.round(baseUnitPrice - adjustmentValue));
  }

  if (item.adjustmentType === "surcharge-percent") {
    return Math.max(0, Math.round(baseUnitPrice * (1 + adjustmentValue / 100)));
  }

  if (item.adjustmentType === "surcharge-amount") {
    return Math.max(0, Math.round(baseUnitPrice + adjustmentValue));
  }

  return baseUnitPrice;
}

function getAdjustmentLabel(item: PosTicketItem) {
  const adjustmentValue = Number(item.adjustmentValue || 0);

  if (item.adjustmentType === "none" || adjustmentValue <= 0) {
    return "Sin";
  }

  if (item.adjustmentType === "discount-percent") {
    return `-${adjustmentValue}%`;
  }

  if (item.adjustmentType === "surcharge-percent") {
    return `+${adjustmentValue}%`;
  }

  if (item.adjustmentType === "discount-amount") {
    return `-${formatPrice(adjustmentValue)}`;
  }

  return `+${formatPrice(adjustmentValue)}`;
}

function applyLocalSalePricing(
  items: PosTicketItem[],
  productsById: Map<number, Product>,
  priceList: PosPriceList
): PosTicketItem[] {
  const pricedItems = items.map((item) => {
    const product = productsById.get(item.productId);
    const baseUnitPrice = product
      ? getProductUnitPrice(product, priceList)
      : item.unitPrice;
    const unitPrice = getAdjustedUnitPrice(item, baseUnitPrice);

    return {
      ...item,
      unitPrice,
      subtotal: unitPrice * item.quantity,
    };
  });

  const groupedItems = new Map<string, PosTicketItem[]>();

  for (const item of pricedItems) {
    const groupKey =
      item.lineGroupId || `${item.productId}|${item.variantColor}`;
    const currentItems = groupedItems.get(groupKey) ?? [];

    currentItems.push(item);
    groupedItems.set(groupKey, currentItems);
  }

  return pricedItems.map((item) => {
    const groupKey =
      item.lineGroupId || `${item.productId}|${item.variantColor}`;
    const groupItems = groupedItems.get(groupKey) ?? [item];
    const product = productsById.get(item.productId);
    const variant = product?.variants.find(
      (productVariant) => productVariant.color === item.variantColor
    );
    const expectedSizes = variant?.sizes.map((size) => size.size) ?? [];
    const groupQuantities = groupItems.map((groupItem) => groupItem.quantity);
    const firstQuantity = groupQuantities[0] ?? 0;
    const isCompleteCurve =
      priceList === "curve" &&
      !!product &&
      isCurveProduct(product) &&
      expectedSizes.length > 0 &&
      expectedSizes.every((size) =>
        groupItems.some(
          (groupItem) => groupItem.size === size && groupItem.quantity > 0
        )
      ) &&
      groupQuantities.every((quantity) => quantity === firstQuantity);

    return {
      ...item,
      saleMode: isCompleteCurve ? ("curve" as const) : ("unit" as const),
      bundleQuantity: isCompleteCurve
        ? firstQuantity
        : groupItems.reduce(
            (total, groupItem) => total + groupItem.quantity,
            0
          ),
      unitsPerBundle: isCompleteCurve ? expectedSizes.length : 1,
      bundlePrice: isCompleteCurve
        ? item.unitPrice * expectedSizes.length
        : item.unitPrice,
    };
  });
}

export default function PointOfSalePanel({
  products,
  isLoadingProducts,
  onSaleCreated,
}: Props) {
  const [initialTicketDraft] = useState(getStoredPosTicket);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedColor, setSelectedColor] = useState("");
  const [sizeQuantities, setSizeQuantities] = useState<
    Record<string, number>
  >({});
  const [ticketItems, setTicketItems] = useState<PosTicketItem[]>(
    initialTicketDraft.ticketItems
  );
  const [priceList, setPriceList] = useState<PosPriceList>(
    initialTicketDraft.priceList
  );
  const [operationType, setOperationType] =
    useState<PosOperationType>("sale");
  const [paymentMethod, setPaymentMethod] =
    useState<LocalSalePaymentMethod>(
      initialTicketDraft.paymentMethod
    );
  const [cashAmount, setCashAmount] = useState(
    initialTicketDraft.cashAmount
  );
  const [transferAmount, setTransferAmount] = useState(
    initialTicketDraft.transferAmount
  );
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(
    initialTicketDraft.shouldPrintReceipt
  );
  const [editingAdjustmentKey, setEditingAdjustmentKey] = useState<
    string | null
  >(null);
  const [draftAdjustmentType, setDraftAdjustmentType] =
    useState<PosAdjustmentType>("none");
  const [draftAdjustmentValue, setDraftAdjustmentValue] = useState("");
  const [selectedTicketItemKeys, setSelectedTicketItemKeys] = useState<
    string[]
  >([]);
  const [isBulkAdjustmentOpen, setIsBulkAdjustmentOpen] = useState(false);
  const [bulkAdjustmentType, setBulkAdjustmentType] =
    useState<PosAdjustmentType>("discount-amount");
  const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState("");
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [isVariantPickerOpen, setIsVariantPickerOpen] = useState(false);
  const [isSaleConfirmOpen, setIsSaleConfirmOpen] = useState(false);
  const [expandedStockProductId, setExpandedStockProductId] =
    useState<number | null>(null);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const cashAmountInputRef = useRef<HTMLInputElement>(null);
  const transferAmountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasDraftTicket =
      ticketItems.length > 0 ||
      priceList !== "base" ||
      paymentMethod !== "cash" ||
      cashAmount.trim().length > 0 ||
      transferAmount.trim().length > 0 ||
      shouldPrintReceipt;

    if (!hasDraftTicket) {
      window.localStorage.removeItem(posTicketStorageKey);
      return;
    }

    window.localStorage.setItem(
      posTicketStorageKey,
      JSON.stringify({
        ticketItems,
        priceList,
        paymentMethod,
        cashAmount,
        transferAmount,
        shouldPrintReceipt,
      })
    );
  }, [
    cashAmount,
    paymentMethod,
    priceList,
    shouldPrintReceipt,
    ticketItems,
    transferAmount,
  ]);

  useEffect(() => {
    if (!isSaleConfirmOpen) return;

    const focusTimer = window.setTimeout(() => {
      const inputToFocus =
        paymentMethod === "transfer"
          ? transferAmountInputRef.current
          : cashAmountInputRef.current;

      inputToFocus?.focus();
      inputToFocus?.select();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [isSaleConfirmOpen, paymentMethod]);

  const saleProducts = useMemo(() => products, [products]);
  const productsById = useMemo(
    () => new Map(saleProducts.map((product) => [product.id, product])),
    [saleProducts]
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return saleProducts.slice(0, 8);

    return saleProducts
      .filter((product) =>
        [
          product.name,
          product.slug,
          product.category,
          product.sku ?? "",
          getShortSku(product.sku),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      )
      .slice(0, 8);
  }, [saleProducts, normalizedSearch]);
  const productListItems = useMemo(
    () => [...saleProducts].sort((first, second) => second.id - first.id),
    [saleProducts]
  );

  const selectedProduct =
    saleProducts.find((product) => product.id === selectedProductId) ||
    null;
  const selectedVariant =
    selectedProduct?.variants.find(
      (variant) => variant.color === selectedColor
    ) ||
    selectedProduct?.variants[0] ||
    null;
  const selectedAllRows = useMemo(
    () =>
      selectedProduct
        ? selectedProduct.variants.flatMap((variant) =>
            variant.sizes.map((size) => {
              const quantityKey = getVariantQuantityKey(
                variant.color,
                size.size
              );
              const inTicket =
                ticketItems.find(
                  (item) =>
                    item.productId === selectedProduct.id &&
                    item.variantColor === variant.color &&
                    item.size === size.size
                )?.quantity ?? 0;
              const available = Math.max(size.stock - inTicket, 0);
              const quantity = Math.min(
                Math.max(sizeQuantities[quantityKey] ?? 0, 0),
                available
              );

              return {
                ...size,
                color: variant.color,
                images: variant.images,
                available,
                quantity,
                quantityKey,
              };
            })
          )
        : [],
    [selectedProduct, sizeQuantities, ticketItems]
  );
  const selectedSizeRows = useMemo(
    () =>
      selectedVariant
        ? selectedAllRows.filter(
            (row) => row.color === selectedVariant.color
          )
        : [],
    [selectedAllRows, selectedVariant]
  );
  const selectedQuantityTotal = selectedAllRows.reduce(
    (total, size) => total + size.quantity,
    0
  );
  const pricedTicketItems = useMemo(
    () => applyLocalSalePricing(ticketItems, productsById, priceList),
    [priceList, productsById, ticketItems]
  );
  const total = pricedTicketItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const transferSurcharge =
    paymentMethod === "transfer" || paymentMethod === "mixed"
      ? Math.round(total * transferSurchargeRate)
      : 0;
  const totalToCharge = total + transferSurcharge;
  const totalTicketUnits = pricedTicketItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const selectedTicketKeys = selectedTicketItemKeys.filter((key) =>
    pricedTicketItems.some((item) => item.key === key)
  );
  const selectedTicketCount = selectedTicketKeys.length;
  const isEveryTicketItemSelected =
    pricedTicketItems.length > 0 &&
    selectedTicketCount === pricedTicketItems.length;
  const paymentDetails = useMemo<PaymentDetails>(() => {
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
      change: Math.max(paidTotal - totalToCharge, 0),
      remaining: Math.max(totalToCharge - paidTotal, 0),
    };
  }, [cashAmount, paymentMethod, totalToCharge, transferAmount]);
  const paymentLabel =
    paymentMethods.find((method) => method.value === paymentMethod)
      ?.label ?? "Sin elegir";
  const editingAdjustmentSourceItem =
    ticketItems.find((item) => item.key === editingAdjustmentKey) || null;
  const editingAdjustmentItem =
    pricedTicketItems.find((item) => item.key === editingAdjustmentKey) ||
    null;
  const editingAdjustmentBaseUnitPrice = editingAdjustmentSourceItem
    ? productsById.has(editingAdjustmentSourceItem.productId)
      ? getProductUnitPrice(
          productsById.get(editingAdjustmentSourceItem.productId)!,
          priceList
        )
      : editingAdjustmentSourceItem.unitPrice
    : 0;
  const editingAdjustmentDraftValue =
    draftAdjustmentType === "none" ? 0 : parseMoneyInput(draftAdjustmentValue);
  const editingAdjustmentPreviewUnitPrice = editingAdjustmentSourceItem
    ? getAdjustedUnitPrice(
        {
          ...editingAdjustmentSourceItem,
          adjustmentType:
            editingAdjustmentDraftValue > 0 ? draftAdjustmentType : "none",
          adjustmentValue: editingAdjustmentDraftValue,
        },
        editingAdjustmentBaseUnitPrice
      )
    : 0;
  const editingAdjustmentPreviewDelta =
    editingAdjustmentPreviewUnitPrice - editingAdjustmentBaseUnitPrice;
  const getTicketItemStockLimit = (item: PosTicketItem) =>
    getVariantSizeStock({
      variants: productsById.get(item.productId)?.variants,
      color: item.variantColor,
      size: item.size,
    });

  useEffect(() => {
    const closePopupsOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (isSaleConfirmOpen) {
        setIsSaleConfirmOpen(false);
        return;
      }

      if (editingAdjustmentKey) {
        setEditingAdjustmentKey(null);
        setDraftAdjustmentType("none");
        setDraftAdjustmentValue("");
        return;
      }

      if (isBulkAdjustmentOpen) {
        setIsBulkAdjustmentOpen(false);
        setBulkAdjustmentType("discount-amount");
        setBulkAdjustmentValue("");
        return;
      }

      if (isVariantPickerOpen) {
        setIsVariantPickerOpen(false);
        return;
      }

      if (isProductListOpen) {
        setIsProductListOpen(false);
      }
    };

    window.addEventListener("keydown", closePopupsOnEscape);

    return () => {
      window.removeEventListener("keydown", closePopupsOnEscape);
    };
  }, [
    editingAdjustmentKey,
    isBulkAdjustmentOpen,
    isProductListOpen,
    isSaleConfirmOpen,
    isVariantPickerOpen,
  ]);

  const selectProduct = (product: Product) => {
    const firstAvailableVariant =
      product.variants.find((variant) =>
        variant.sizes.some((size) => size.stock > 0)
      ) || product.variants[0];

    setSelectedProductId(product.id);
    setSearchQuery(product.name);
    setSelectedColor(firstAvailableVariant?.color ?? "");
    setSizeQuantities({});
    setIsProductListOpen(false);
    setIsVariantPickerOpen(true);
    setExpandedStockProductId(null);
    setError("");
    setNotice("");
  };

  const returnToProductList = () => {
    setIsVariantPickerOpen(false);
    setIsProductListOpen(true);
  };

  const repriceItems = (items: PosTicketItem[]) =>
    applyLocalSalePricing(items, productsById, priceList);

  const addSelectedProduct = () => {
    setError("");
    setNotice("");

    if (!selectedProduct) {
      setError("Selecciona producto.");
      return;
    }

    const selectedVariants = selectedAllRows.filter(
      (size) => size.quantity > 0
    );

    if (selectedVariants.length === 0) {
      setError("Carga cantidad en al menos un talle.");
      return;
    }

    const unitPrice = getProductUnitPrice(selectedProduct, priceList);

    setTicketItems((currentItems) => {
      let updatedItems = [...currentItems];
      const lineGroupIdsByColor = new Map<string, string>();

      for (const size of selectedVariants) {
        const colorGroupKey = `${selectedProduct.id}|${size.color}`;
        const existingGroupId = updatedItems.find(
          (item) =>
            item.productId === selectedProduct.id &&
            item.variantColor === size.color
        )?.lineGroupId;
        const lineGroupId =
          existingGroupId ||
          lineGroupIdsByColor.get(colorGroupKey) ||
          crypto.randomUUID();

        lineGroupIdsByColor.set(colorGroupKey, lineGroupId);

        const itemKey = getItemKey(
          selectedProduct.id,
          size.color,
          size.size
        );
        const existingItem = updatedItems.find(
          (item) => item.key === itemKey
        );

        updatedItems = existingItem
          ? updatedItems.map((item) =>
              item.key === itemKey
                ? {
                    ...item,
                    quantity: item.quantity + size.quantity,
                    subtotal:
                      item.unitPrice * (item.quantity + size.quantity),
                  }
                : item
            )
          : [
              ...updatedItems,
              {
                key: itemKey,
                productId: selectedProduct.id,
                productSlug: selectedProduct.slug,
                productSku: selectedProduct.sku,
                productName: selectedProduct.name,
                variantColor: size.color,
                size: size.size,
                quantity: size.quantity,
                unitPrice,
                subtotal: unitPrice * size.quantity,
                lineGroupId,
                saleMode: "unit" as const,
                bundleQuantity: size.quantity,
                unitsPerBundle: 1,
                bundlePrice: unitPrice,
                adjustmentType: "none",
                adjustmentValue: 0,
                imageUrl:
                  size.images[0] ||
                  selectedProduct.images[0] ||
                  "",
              },
            ];
      }

      return repriceItems(updatedItems);
    });

    setSizeQuantities({});
    setIsVariantPickerOpen(false);
    setSelectedProductId(null);
    setSearchQuery("");
    setNotice("Producto agregado al ticket.");
  };

  const updateSizeQuantity = (
    color: string,
    size: string,
    quantity: number
  ) => {
    const quantityKey = getVariantQuantityKey(color, size);
    const sizeRow = selectedAllRows.find(
      (currentSize) =>
        currentSize.color === color && currentSize.size === size
    );
    const safeQuantity = Math.min(
      Math.max(quantity, 0),
      sizeRow?.available ?? 0
    );

    setSizeQuantities((currentQuantities) => ({
      ...currentQuantities,
      [quantityKey]: safeQuantity,
    }));
  };

  const fillCurveQuantities = () => {
    setSizeQuantities((currentQuantities) => ({
      ...currentQuantities,
      ...Object.fromEntries(
        selectedSizeRows.map((size) => [
          size.quantityKey,
          size.available > 0 ? 1 : 0,
        ])
      ),
    }));
  };

  const clearSizeQuantities = () => {
    setSizeQuantities((currentQuantities) => {
      const nextQuantities = { ...currentQuantities };

      for (const size of selectedSizeRows) {
        delete nextQuantities[size.quantityKey];
      }

      return nextQuantities;
    });
  };

  const updateTicketQuantity = (key: string, nextQuantity: number) => {
    setTicketItems((currentItems) => {
      const updatedItems = currentItems
        .map((item) => {
          if (item.key !== key) return item;

          const product = productsById.get(item.productId);
          const stockLimit = getVariantSizeStock({
            variants: product?.variants,
            color: item.variantColor,
            size: item.size,
          });
          const nextSafeQuantity = Math.min(
            Math.max(nextQuantity, 0),
            stockLimit
          );

          return {
            ...item,
            quantity: nextSafeQuantity,
            subtotal: item.unitPrice * nextSafeQuantity,
          };
        })
        .filter((item) => item.quantity > 0);

      return repriceItems(updatedItems);
    });
  };

  const removeTicketItem = (key: string) => {
    setTicketItems((currentItems) =>
      repriceItems(currentItems.filter((item) => item.key !== key))
    );
    setSelectedTicketItemKeys((currentKeys) =>
      currentKeys.filter((currentKey) => currentKey !== key)
    );
  };

  const openAdjustmentEditor = (item: PosTicketItem) => {
    setEditingAdjustmentKey(item.key);
    setDraftAdjustmentType(item.adjustmentType);
    setDraftAdjustmentValue(
      item.adjustmentValue > 0 ? getMoneyInputValue(item.adjustmentValue) : ""
    );
  };

  const closeAdjustmentEditor = () => {
    setEditingAdjustmentKey(null);
    setDraftAdjustmentType("none");
    setDraftAdjustmentValue("");
  };

  const toggleTicketItemSelection = (key: string) => {
    setSelectedTicketItemKeys((currentKeys) =>
      currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key]
    );
  };

  const toggleAllTicketItemsSelection = () => {
    setSelectedTicketItemKeys(
      isEveryTicketItemSelected
        ? []
        : pricedTicketItems.map((item) => item.key)
    );
  };

  const openBulkAdjustmentEditor = () => {
    if (selectedTicketCount === 0) {
      setError("Selecciona al menos un articulo del ticket.");
      return;
    }

    setError("");
    setBulkAdjustmentType("discount-amount");
    setBulkAdjustmentValue("");
    setIsBulkAdjustmentOpen(true);
  };

  const closeBulkAdjustmentEditor = () => {
    setIsBulkAdjustmentOpen(false);
    setBulkAdjustmentType("discount-amount");
    setBulkAdjustmentValue("");
  };

  const applyBulkAdjustment = () => {
    const adjustmentValue = parseMoneyInput(bulkAdjustmentValue);

    setTicketItems((currentItems) =>
      applyLocalSalePricing(
        currentItems.map((item) =>
          selectedTicketKeys.includes(item.key)
            ? {
                ...item,
                adjustmentType:
                  adjustmentValue > 0 ? bulkAdjustmentType : "none",
                adjustmentValue,
              }
            : item
        ),
        productsById,
        priceList
      )
    );

    closeBulkAdjustmentEditor();
  };

  const clearSelectedAdjustments = () => {
    if (selectedTicketCount === 0) {
      setError("Selecciona al menos un articulo del ticket.");
      return;
    }

    setTicketItems((currentItems) =>
      applyLocalSalePricing(
        currentItems.map((item) =>
          selectedTicketKeys.includes(item.key)
            ? {
                ...item,
                adjustmentType: "none",
                adjustmentValue: 0,
              }
            : item
        ),
        productsById,
        priceList
      )
    );
    setError("");
  };

  const saveAdjustment = () => {
    if (!editingAdjustmentKey) return;

    const adjustmentValue =
      draftAdjustmentType === "none"
        ? 0
        : parseMoneyInput(draftAdjustmentValue);

    setTicketItems((currentItems) =>
      repriceItems(
        currentItems.map((item) =>
          item.key === editingAdjustmentKey
            ? {
                ...item,
                adjustmentType: adjustmentValue > 0 ? draftAdjustmentType : "none",
                adjustmentValue,
              }
            : item
        )
      )
    );

    closeAdjustmentEditor();
  };

  const handlePaymentMethodChange = (method: LocalSalePaymentMethod) => {
    setPaymentMethod(method);

    const nextTotalToCharge =
      total +
      (method === "transfer" || method === "mixed"
        ? Math.round(total * transferSurchargeRate)
        : 0);

    if (method === "cash" && cashAmount.trim().length === 0) {
      setCashAmount(getMoneyInputValue(nextTotalToCharge));
    }

    if (
      method === "transfer" &&
      transferAmount.trim().length === 0
    ) {
      setTransferAmount(getMoneyInputValue(nextTotalToCharge));
    }
  };

  const openSaleConfirm = () => {
    setError("");

    if (pricedTicketItems.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }

    if (
      priceList === "curve" &&
      pricedTicketItems.some((item) => item.saleMode !== "curve")
    ) {
      setError(
        "Para usar precio curva agrega todos los talles con la misma cantidad."
      );
      return;
    }

    if (
      operationType === "sale" &&
      paymentMethod === "cash"
    ) {
      setCashAmount(getMoneyInputValue(totalToCharge));
    }

    if (
      operationType === "sale" &&
      paymentMethod === "transfer"
    ) {
      setTransferAmount(getMoneyInputValue(totalToCharge));
    }

    setIsSaleConfirmOpen(true);
  };

  const clearTicket = () => {
    setTicketItems([]);
    setSelectedTicketItemKeys([]);
    setPriceList("base");
    setOperationType("sale");
    setCashAmount("");
    setTransferAmount("");
    setError("");
    setNotice("");
  };

  const confirmSale = async () => {
    if (isSavingSale) return;

    if (pricedTicketItems.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }

    if (
      priceList === "curve" &&
      pricedTicketItems.some((item) => item.saleMode !== "curve")
    ) {
      setError(
        "Para usar precio curva agrega todos los talles con la misma cantidad."
      );
      return;
    }

    if (operationType === "sale" && paymentDetails.paidTotal < totalToCharge) {
      setError(`Falta cobrar ${formatPrice(paymentDetails.remaining)}.`);
      return;
    }

    const receiptWindow = shouldPrintReceipt
      ? window.open("", "_blank", "width=420,height=720")
      : null;
    const saleNumber = createLocalSaleNumber();
    const receiptItems = pricedTicketItems.map((item) => ({ ...item }));
    const receiptTotal = totalToCharge;
    const receiptPaymentMethod = paymentMethod;

    setIsSavingSale(true);
    setError("");
    setNotice("");

    try {
      const saleNotes = [
        `Pago local: ${paymentLabel}`,
        `Lista: ${getPriceListLabel(priceList)}`,
        operationType === "reserve" ? "Operacion: Reserva" : "Operacion: Contado",
        transferSurcharge > 0
          ? `Recargo transferencia 5% ${formatPrice(transferSurcharge)}`
          : "",
        pricedTicketItems.some((item) => item.adjustmentType !== "none")
          ? "Con ajustes por producto"
          : "",
        paymentDetails.cashAmount > 0
          ? `Efectivo ${formatPrice(paymentDetails.cashAmount)}`
          : "",
        paymentDetails.transferAmount > 0
          ? `Transferencia ${formatPrice(paymentDetails.transferAmount)}`
          : "",
        paymentDetails.change > 0
          ? `Vuelto ${formatPrice(paymentDetails.change)}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const sale = await createLocalSale({
        saleNumber,
        paymentMethod,
        status: operationType === "reserve" ? "reserved" : "completed",
        total: totalToCharge,
        internalNotes: saleNotes,
        items: pricedTicketItems,
      });

      printLocalSaleReceipt({
        printWindow: receiptWindow,
        saleNumber: sale.saleNumber,
        paymentMethod: receiptPaymentMethod,
        total: receiptTotal,
        items: receiptItems,
      });
      setNotice(
        operationType === "reserve"
          ? `Reserva #${getShortSaleNumber(sale.saleNumber)} registrada.`
          : `Venta #${getShortSaleNumber(sale.saleNumber)} registrada.`
      );
      setIsSaleConfirmOpen(false);
      setTicketItems([]);
      setSelectedTicketItemKeys([]);
      setSelectedProductId(null);
      setSearchQuery("");
      setSizeQuantities({});
      setPriceList("base");
      setOperationType("sale");
      setCashAmount("");
      setTransferAmount("");
      await onSaleCreated();
    } catch (saleError) {
      receiptWindow?.close();
      setError(
        saleError instanceof Error
          ? saleError.message
          : "No se pudo registrar la venta."
      );
    } finally {
      setIsSavingSale(false);
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[280px] max-w-[420px] shrink-0">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="search"
            placeholder="Escanear o buscar producto por SKU/nombre"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSelectedProductId(null);
              setIsVariantPickerOpen(false);
            }}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
          />

          {searchQuery.trim().length > 0 && !selectedProduct && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
              {searchResults.length === 0 ? (
                <p className="px-3 py-3 text-sm text-zinc-500">
                  No hay productos con esa busqueda.
                </p>
              ) : (
                searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-zinc-900"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-white">
                        {product.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        SKU {getShortSku(product.sku)} · Stock{" "}
                        {product.stock ?? 0}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-zinc-200">
                      {formatPrice(getProductUnitPrice(product, priceList))}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProductListOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
          >
            <List size={16} />
            Lista de productos
          </button>

          <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Lista
            </span>
            <select
              id="pos-price-list"
              className="h-8 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs font-bold text-white outline-none transition focus:border-zinc-400"
              value={priceList}
              onChange={(event) =>
                setPriceList(event.target.value as PosPriceList)
              }
            >
              {priceLists.map((list) => (
                <option
                  key={list.value}
                  value={list.value}
                >
                  {list.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Tipo
            </span>
            <select
              className="h-8 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs font-bold text-white outline-none transition focus:border-zinc-400"
              value={operationType}
              onChange={(event) =>
                setOperationType(event.target.value as PosOperationType)
              }
            >
              {operationTypes.map((operation) => (
                <option
                  key={operation.value}
                  value={operation.value}
                >
                  {operation.label}
                </option>
              ))}
            </select>
          </label>

          {notice && (
            <span className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl bg-emerald-400/15 px-3 text-sm font-semibold text-emerald-200">
              <CheckCircle size={16} />
              <span className="truncate">{notice}</span>
            </span>
          )}

          {error && (
            <span className="inline-flex h-10 min-w-0 items-center rounded-xl bg-red-500/15 px-3 text-sm font-semibold text-red-200">
              <span className="truncate">{error}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={clearTicket}
          disabled={ticketItems.length === 0}
          className="ml-auto mr-1 h-10 rounded-xl bg-red-500/15 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpiar
        </button>
      </div>

      {/*
      {selectedProduct && selectedVariant && false && (
        <div className="grid shrink-0 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 xl:grid-cols-[minmax(220px,1fr)_minmax(260px,1.3fr)_minmax(260px,1.2fr)_170px] xl:items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {selectedProduct.name}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-500">
              SKU {getShortSku(selectedProduct.sku)} ·{" "}
              {formatPrice(selectedProduct.price)}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase text-zinc-500">
              Color
            </span>
            {selectedProduct.variants.map((variant) => (
              <button
                key={variant.color}
                type="button"
                onClick={() => {
                  setSelectedColor(variant.color);
                  setSelectedSize(getFirstAvailableSize(variant));
                }}
                disabled={getVariantStock(variant) <= 0}
                className={`h-8 rounded-lg border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  selectedVariant.color === variant.color
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-400"
                }`}
              >
                {variant.color}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase text-zinc-500">
              Talle
            </span>
            {selectedVariant.sizes.map((size) => {
              const inTicket =
                ticketItems.find(
                  (item) =>
                    item.productId === selectedProduct.id &&
                    item.variantColor === selectedVariant.color &&
                    item.size === size.size
                )?.quantity ?? 0;
              const available = Math.max(size.stock - inTicket, 0);

              return (
                <button
                  key={size.size}
                  type="button"
                  onClick={() => setSelectedSize(size.size)}
                  disabled={available <= 0}
                  title={
                    available > 0
                      ? `${available} disponible`
                      : "Sin stock disponible"
                  }
                  className={`h-8 rounded-lg border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                    selectedSize === size.size
                      ? "border-emerald-300 bg-emerald-400 text-black"
                      : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {size.size}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="flex h-9 items-center rounded-xl border border-zinc-700 bg-zinc-950">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
                className="flex h-full w-9 items-center justify-center text-zinc-300 transition hover:text-white"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-8 text-center text-sm font-bold">
                {safeQuantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    Math.min(current + 1, availableToAdd || 1)
                  )
                }
                className="flex h-full w-9 items-center justify-center text-zinc-300 transition hover:text-white"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={addSelectedProduct}
              disabled={availableToAdd <= 0}
              className="h-9 rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
      */}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pb-[76px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="min-h-0 flex-1 overflow-hidden p-2">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-zinc-900 px-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked={isEveryTicketItemSelected}
                      onChange={toggleAllTicketItemsSelection}
                      disabled={pricedTicketItems.length === 0}
                      className="h-4 w-4 cursor-pointer accent-emerald-400 disabled:cursor-not-allowed"
                    />
                    Todos
                  </label>
                  <span className="text-xs font-semibold text-zinc-500">
                    {selectedTicketCount} seleccionados
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearSelectedAdjustments}
                    disabled={selectedTicketCount === 0}
                    className="h-8 cursor-pointer rounded-lg bg-zinc-900 px-3 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sin ajuste
                  </button>
                  <button
                    type="button"
                    onClick={openBulkAdjustmentEditor}
                    disabled={selectedTicketCount === 0}
                    className="h-8 cursor-pointer rounded-lg bg-amber-300 px-3 text-xs font-black text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Ajustar
                  </button>
                </div>
              </div>

              <div
                className={`grid ${ticketGridColumns} shrink-0 gap-2 border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500`}
              >
                <span />
                <span>SKU</span>
                <span>Producto</span>
                <span className="text-center">Color</span>
                <span className="text-center">Talle</span>
                <span className="text-center">Cant.</span>
                <span className="text-center">Unit.</span>
                <span className="text-center">Ajuste</span>
                <span className="text-center">Subtotal</span>
                <span />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
                {pricedTicketItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-zinc-500">
                    Busca un producto y agregalo al ticket.
                  </div>
                ) : (
                  pricedTicketItems.map((item, index) => {
                    const stockLimit = getTicketItemStockLimit(item);
                    const isAtStockLimit =
                      stockLimit > 0 && item.quantity >= stockLimit;
                    const product = productsById.get(item.productId);
                    const baseUnitPrice = product
                      ? getProductUnitPrice(product, priceList)
                      : item.unitPrice;
                    const hasPriceAdjustment =
                      item.adjustmentType !== "none" &&
                      Number(item.adjustmentValue || 0) > 0 &&
                      item.unitPrice !== baseUnitPrice;

                    return (
                      <div
                        key={item.key}
                        className={`grid ${ticketGridColumns} items-center gap-2 border-b border-zinc-900/80 px-3 py-2.5 transition hover:bg-zinc-900/70 ${
                          index % 2 === 0 ? "bg-zinc-950/35" : "bg-zinc-900/15"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedTicketKeys.includes(item.key)}
                            onChange={() => toggleTicketItemSelection(item.key)}
                            className="h-4 w-4 cursor-pointer accent-emerald-400"
                            aria-label={`Seleccionar ${item.productName}`}
                          />
                        </div>

                        <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200">
                          {getShortSku(item.productSku)}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {item.productName}
                          </p>
                          {isAtStockLimit && (
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-300">
                              Stock maximo ({stockLimit})
                            </p>
                          )}
                        </div>

                        <span className="mx-auto w-fit rounded-full bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-200">
                          {item.variantColor}
                        </span>

                        <span className="mx-auto w-fit rounded-full bg-white px-2 py-1 text-xs font-bold text-black">
                          {item.size}
                        </span>

                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateTicketQuantity(
                                item.key,
                                item.quantity - 1
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-white transition hover:bg-zinc-700"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-6 text-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateTicketQuantity(
                                item.key,
                                item.quantity + 1
                              )
                            }
                            disabled={isAtStockLimit}
                            title={
                              isAtStockLimit
                                ? `Stock maximo: ${stockLimit}`
                                : "Sumar una unidad"
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="text-center tabular-nums">
                          {hasPriceAdjustment && (
                            <p className="text-[11px] font-bold text-zinc-500 line-through">
                              {formatPrice(baseUnitPrice)}
                            </p>
                          )}
                          <p
                            className={`text-sm font-black ${
                              hasPriceAdjustment
                                ? "text-emerald-100"
                                : "text-zinc-300"
                            }`}
                          >
                            {formatPrice(item.unitPrice)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openAdjustmentEditor(item)}
                          className={`h-8 rounded-lg px-2 text-xs font-bold transition ${
                            item.adjustmentType === "none"
                              ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                              : "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                          }`}
                        >
                          {getAdjustmentLabel(item)}
                        </button>

                        <p className="text-center text-sm font-bold tabular-nums text-white">
                          {formatPrice(item.subtotal)}
                        </p>

                        <div className="flex h-full items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeTicketItem(item.key)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-200 transition hover:bg-red-500/25"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="absolute bottom-2 left-2 right-2 z-20 rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl shadow-black/40">
          <div className="mx-auto grid max-w-5xl grid-cols-[74px_100px_minmax(36px,1fr)_250px_240px_148px] items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShouldPrintReceipt((currentValue) => !currentValue)
              }
              className={`flex h-14 flex-col items-center justify-center rounded-xl border px-1.5 text-[10px] font-black uppercase transition ${
                shouldPrintReceipt
                  ? "border-emerald-300 bg-emerald-400/15 text-emerald-200"
                  : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {shouldPrintReceipt ? (
                <CheckCircle size={17} />
              ) : (
                <X size={17} />
              )}
              <span className="mt-0.5">Imp.</span>
            </button>

            <div className="flex h-14 flex-col justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">
                Prendas
              </p>
              <p className="text-2xl font-black leading-none text-white">
                {totalTicketUnits}
              </p>
            </div>

            <div />

            <div
              className={`flex h-14 items-center justify-center gap-3 rounded-xl px-4 text-center text-black ${
                operationType === "reserve"
                  ? "bg-amber-300"
                  : "bg-emerald-400"
              }`}
            >
              <p className="text-sm font-black uppercase tracking-wide">
                Total
              </p>
              <div className="min-w-0">
                {transferSurcharge > 0 && (
                  <p className="text-xs font-black leading-none text-black/55 line-through">
                    {formatPrice(total)}
                  </p>
                )}
                <p className="truncate text-3xl font-black leading-none">
                  {formatPrice(totalToCharge)}
                </p>
              </div>
            </div>

            <div className="flex h-14 items-center rounded-xl border border-zinc-800 bg-zinc-950 px-2">
              <select
                className="h-11 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-base font-black text-white outline-none transition focus:border-zinc-400"
                value={paymentMethod}
                onChange={(event) =>
                  handlePaymentMethodChange(
                    event.target.value as LocalSalePaymentMethod
                  )
                }
              >
                {paymentMethods.map((method) => (
                  <option
                    key={method.value}
                    value={method.value}
                  >
                    {method.value === "transfer"
                      ? `${method.label} (+5%)`
                      : method.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={openSaleConfirm}
              disabled={isSavingSale || ticketItems.length === 0}
              className={`h-14 rounded-xl text-base font-black text-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                operationType === "reserve"
                  ? "bg-amber-300 hover:bg-amber-200"
                  : "bg-emerald-400 hover:bg-emerald-300"
              }`}
            >
              {operationType === "reserve" ? "Reservar" : "Confirmar"}
            </button>

          </div>
        </aside>
      </div>

      {isSaleConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {operationType === "reserve"
                    ? "Confirmar reserva"
                    : "Confirmar venta"}
                </p>
                {transferSurcharge > 0 && (
                  <p className="mt-1 text-sm font-bold text-zinc-500 line-through">
                    {formatPrice(total)}
                  </p>
                )}
                <h2 className="text-2xl font-black text-white">
                  {formatPrice(totalToCharge)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsSaleConfirmOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase text-zinc-500">
                    Metodo de pago
                  </span>
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      handlePaymentMethodChange(
                        event.target.value as LocalSalePaymentMethod
                      )
                    }
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-white outline-none transition focus:border-zinc-400"
                  >
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

                <button
                  type="button"
                  onClick={() =>
                    setShouldPrintReceipt((currentValue) => !currentValue)
                  }
                  className={`mt-6 flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs font-black uppercase transition ${
                    shouldPrintReceipt
                      ? "border-emerald-300 bg-emerald-400/15 text-emerald-200"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  {shouldPrintReceipt ? (
                    <CheckCircle size={16} />
                  ) : (
                    <X size={16} />
                  )}
                  Imp.
                </button>
              </div>

              {transferSurcharge > 0 && (
                <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">
                  Incluye recargo por transferencia:{" "}
                  {formatPrice(transferSurcharge)}
                </p>
              )}

              {operationType === "reserve" && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">
                  La reserva bloquea stock. El pago se puede completar despues
                  desde Ventas.
                </p>
              )}

              {(paymentMethod === "cash" || paymentMethod === "mixed") && (
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase text-zinc-500">
                    Efectivo recibido
                  </span>
                  <input
                    ref={cashAmountInputRef}
                    type="text"
                    inputMode="numeric"
                    value={cashAmount}
                    onChange={(event) =>
                      setCashAmount(formatMoneyInput(event.target.value))
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;

                      event.preventDefault();
                      void confirmSale();
                    }}
                    placeholder="0"
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-lg font-bold text-white outline-none transition focus:border-zinc-400"
                  />
                </label>
              )}

              {(paymentMethod === "transfer" || paymentMethod === "mixed") && (
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase text-zinc-500">
                    Transferencia
                  </span>
                  <input
                    ref={transferAmountInputRef}
                    type="text"
                    inputMode="numeric"
                    value={transferAmount}
                    onChange={(event) =>
                      setTransferAmount(formatMoneyInput(event.target.value))
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;

                      event.preventDefault();
                      void confirmSale();
                    }}
                    placeholder="0"
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-lg font-bold text-white outline-none transition focus:border-zinc-400"
                  />
                </label>
              )}

              {operationType === "sale" &&
                (paymentDetails.remaining > 0 || paymentDetails.change > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-zinc-900 p-2.5">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Falta
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {formatPrice(paymentDetails.remaining)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 p-2.5">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Vuelto
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {formatPrice(paymentDetails.change)}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSaleConfirmOpen(false)}
                className="h-11 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmSale}
                disabled={isSavingSale}
                className="h-11 rounded-xl bg-emerald-400 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingSale
                  ? "Registrando..."
                  : operationType === "reserve"
                    ? "Registrar reserva"
                    : "Registrar venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBulkAdjustmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Ajuste masivo
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {selectedTicketCount} articulos seleccionados
                </h2>
              </div>

              <button
                type="button"
                onClick={closeBulkAdjustmentEditor}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              >
                <X size={17} />
              </button>
            </div>

            <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
              El monto se aplica por unidad a cada articulo seleccionado. No
              modifica el precio del producto.
            </p>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Tipo
                </span>
                <select
                  value={bulkAdjustmentType}
                  onChange={(event) =>
                    setBulkAdjustmentType(
                      event.target.value as PosAdjustmentType
                    )
                  }
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-white outline-none transition focus:border-zinc-400"
                >
                  {adjustmentOptions
                    .filter((option) => option.value !== "none")
                    .map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Monto en pesos
                </span>
                <input
                  type="number"
                  min="0"
                  value={bulkAdjustmentValue}
                  onChange={(event) =>
                    setBulkAdjustmentValue(event.target.value)
                  }
                  placeholder="Ej: 1000"
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-lg font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeBulkAdjustmentEditor}
                className="h-11 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyBulkAdjustment}
                className="h-11 rounded-xl bg-white text-sm font-black text-black transition hover:bg-zinc-200"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAdjustmentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Ajuste puntual
                </p>
                <h2 className="mt-1 truncate text-lg font-bold text-white">
                  {editingAdjustmentItem.productName}
                </h2>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  {editingAdjustmentItem.variantColor} - Talle{" "}
                  {editingAdjustmentItem.size}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdjustmentEditor}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              >
                <X size={17} />
              </button>
            </div>

            <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
              Este cambio aplica solo a esta venta. No modifica el precio del
              producto.
            </p>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Tipo
                </span>
                <select
                  value={draftAdjustmentType}
                  onChange={(event) =>
                    setDraftAdjustmentType(
                      event.target.value as PosAdjustmentType
                    )
                  }
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-white outline-none transition focus:border-zinc-400"
                >
                  {adjustmentOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Monto en pesos
                </span>
                <input
                  type="number"
                  min="0"
                  value={draftAdjustmentValue}
                  onChange={(event) =>
                    setDraftAdjustmentValue(event.target.value)
                  }
                  disabled={draftAdjustmentType === "none"}
                  placeholder="Ej: 1000"
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-lg font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
                />
              </label>

              <div className="grid gap-2 rounded-xl bg-zinc-900 p-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Precio base</span>
                  <span className="font-bold tabular-nums">
                    {formatPrice(editingAdjustmentBaseUnitPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ajuste</span>
                  <span
                    className={`font-bold tabular-nums ${
                      editingAdjustmentPreviewDelta < 0
                        ? "text-red-200"
                        : editingAdjustmentPreviewDelta > 0
                          ? "text-amber-200"
                          : "text-zinc-300"
                    }`}
                  >
                    {editingAdjustmentPreviewDelta > 0 ? "+" : ""}
                    {formatPrice(editingAdjustmentPreviewDelta)}
                  </span>
                </div>
                <div className="flex justify-between rounded-lg bg-zinc-950 px-2 py-2 font-black text-white">
                  <span>Final unitario</span>
                  <span className="tabular-nums">
                    {formatPrice(editingAdjustmentPreviewUnitPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeAdjustmentEditor}
                className="h-11 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveAdjustment}
                className="h-11 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {isVariantPickerOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  <Image
                    src={getProductImage(selectedProduct)}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-white">
                    {selectedProduct.name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    SKU {getShortSku(selectedProduct.sku)} - Mayorista{" "}
                    {formatPrice(selectedProduct.price)} - Curva{" "}
                    {formatPrice(
                      selectedProduct.curvePrice || selectedProduct.price
                    )} - Local{" "}
                    {formatPrice(getRetailPrice(selectedProduct))}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={returnToProductList}
                  className="h-10 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-black text-zinc-100 transition hover:border-white hover:bg-zinc-800 hover:text-white"
                >
                  Volver a lista
                </button>

                <button
                  type="button"
                  onClick={() => setIsVariantPickerOpen(false)}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 transition hover:border-red-300 hover:bg-red-500/15 hover:text-red-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                  Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.variants.map((variant) => {
                    const hasColorAvailability = selectedAllRows
                      .filter((row) => row.color === variant.color)
                      .some((row) => row.available > 0);
                    const colorQuantity = selectedAllRows
                      .filter((row) => row.color === variant.color)
                      .reduce((total, row) => total + row.quantity, 0);
                    const isSelected =
                      selectedVariant?.color === variant.color;

                    return (
                      <button
                        key={variant.color}
                        type="button"
                        onClick={() => {
                          if (!hasColorAvailability) return;
                          setSelectedColor(variant.color);
                        }}
                        disabled={!hasColorAvailability}
                        title={
                          hasColorAvailability
                            ? variant.color
                            : `${variant.color} sin stock`
                        }
                        className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                          hasColorAvailability && isSelected
                            ? "border-white bg-white text-black"
                            : hasColorAvailability
                              ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-400"
                              : "cursor-not-allowed border-zinc-900 bg-black/40 text-zinc-600 opacity-45"
                        }`}
                      >
                        {variant.color}
                        {colorQuantity > 0 && (
                          <span className="rounded-md bg-emerald-900/80 px-1.5 py-0.5 text-xs font-black text-emerald-100">
                            {colorQuantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Talles de {selectedVariant?.color ?? "color"}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={fillCurveQuantities}
                      className="h-8 rounded-lg bg-zinc-900 px-3 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                    >
                      Curva color
                    </button>
                    <button
                      type="button"
                      onClick={clearSizeQuantities}
                      className="h-8 rounded-lg bg-zinc-900 px-3 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                    >
                      Limpiar color
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  <div className="grid grid-cols-[minmax(72px,1fr)_92px_128px] gap-2 border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <span>Talle</span>
                    <span className="text-center">Stock</span>
                    <span className="text-center">Cantidad</span>
                  </div>

                  <div className="divide-y divide-zinc-800">
                    {selectedSizeRows.map((size) => (
                      <div
                        key={size.quantityKey}
                        className="grid grid-cols-[minmax(72px,1fr)_92px_128px] items-center gap-2 px-3 py-2"
                      >
                        <span className="text-sm font-bold text-white">
                          {size.size}
                        </span>

                        <span className="text-center">
                          <span
                            className={`inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 text-xs font-black ${
                              size.available > 0
                                ? "bg-emerald-900/80 text-emerald-100"
                                : "bg-red-950 text-red-100"
                            }`}
                          >
                            {size.available}
                          </span>
                        </span>

                        <div className="flex items-center justify-center">
                          <div className="flex h-9 items-center rounded-xl border border-zinc-700 bg-zinc-950">
                            <button
                              type="button"
                              onClick={() =>
                                updateSizeQuantity(
                                  size.color,
                                  size.size,
                                  size.quantity - 1
                                )
                              }
                              disabled={size.quantity <= 0}
                              className="flex h-full w-9 items-center justify-center text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-9 text-center text-sm font-bold">
                              {size.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateSizeQuantity(
                                  size.color,
                                  size.size,
                                  size.quantity + 1
                                )
                              }
                              disabled={size.quantity >= size.available}
                              className="flex h-full w-9 items-center justify-center text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Seleccionado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-300">
                    {selectedQuantityTotal} prendas para agregar
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSelectedProduct}
                  disabled={selectedQuantityTotal === 0}
                  className="h-10 rounded-xl bg-white px-5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Agregar seleccionados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProductListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[78vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Productos
                </p>
                <h2 className="text-xl font-bold">Lista de productos</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProductListOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
              {isLoadingProducts ? (
                <p className="p-4 text-sm text-zinc-500">
                  Cargando productos...
                </p>
              ) : (
                <div className="grid gap-2">
                  <div className="grid grid-cols-[80px_minmax(0,1fr)_96px_96px_96px_76px_92px] gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <span>SKU</span>
                    <span>Nombre</span>
                    <span className="text-center">Mayorista</span>
                    <span className="text-center">Curva</span>
                    <span className="text-center">Local</span>
                    <span className="text-center">Stock</span>
                    <span />
                  </div>

                  {productListItems.map((product, index) => (
                    <div
                      key={product.id}
                      className={`rounded-xl border border-zinc-800 transition hover:border-zinc-500 ${
                        index % 2 === 0 ? "bg-zinc-950/80" : "bg-zinc-900"
                      }`}
                    >
                      <div className="grid grid-cols-[80px_minmax(0,1fr)_96px_96px_96px_76px_92px] items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => selectProduct(product)}
                          className="cursor-pointer rounded-lg bg-zinc-950 px-2 py-1 text-left text-xs font-bold text-zinc-200 transition hover:bg-zinc-800"
                        >
                          {getShortSku(product.sku)}
                        </button>

                        <button
                          type="button"
                          onClick={() => selectProduct(product)}
                          className="min-w-0 cursor-pointer text-left"
                        >
                          <span className="block truncate text-sm font-bold text-white">
                            {product.name}
                          </span>
                        </button>

                        <span className="flex h-full items-center justify-center text-center text-sm font-bold tabular-nums text-zinc-100">
                          {formatPrice(product.price)}
                        </span>

                        <span className="flex h-full items-center justify-center text-center text-sm font-bold tabular-nums text-sky-100">
                          {formatPrice(product.curvePrice || product.price)}
                        </span>

                        <span className="flex h-full items-center justify-center text-center text-sm font-bold tabular-nums text-emerald-100">
                          {formatPrice(getRetailPrice(product))}
                        </span>

                        <span className="flex h-full items-center justify-center text-center text-sm font-semibold tabular-nums text-zinc-400">
                          {product.stock ?? 0}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStockProductId((currentId) =>
                              currentId === product.id ? null : product.id
                            )
                          }
                          className="h-8 rounded-lg bg-zinc-950 px-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                        >
                          Ver stock
                        </button>
                      </div>

                      {expandedStockProductId === product.id && (
                        <div className="border-t border-zinc-800 px-3 pb-3 pt-2">
                          <div className="grid gap-2">
                            {product.variants.map((variant) => {
                              const hasVariantStock = variant.sizes.some(
                                (size) => size.stock > 0
                              );

                              return (
                                <div
                                  key={variant.color}
                                  className={`grid gap-2 rounded-xl p-2 md:grid-cols-[110px_minmax(0,1fr)] md:items-start ${
                                    hasVariantStock
                                      ? "bg-zinc-950"
                                      : "bg-zinc-950/45 opacity-60"
                                  }`}
                                >
                                  <span
                                    className={`text-sm font-bold ${
                                      hasVariantStock
                                        ? "text-white"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {variant.color}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {variant.sizes.map((size) => {
                                      const hasStock = size.stock > 0;

                                      return (
                                        <span
                                          key={`${variant.color}-${size.size}`}
                                          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${
                                            hasStock
                                              ? "bg-zinc-900 text-zinc-300"
                                              : "bg-zinc-950 text-zinc-600 ring-1 ring-zinc-900"
                                          }`}
                                        >
                                          <span
                                            className={
                                              hasStock ? "" : "line-through"
                                            }
                                          >
                                            {size.size}
                                          </span>
                                          <span
                                            className={`rounded-md px-1.5 py-0.5 font-black ${
                                              hasStock
                                                ? "bg-emerald-900/80 text-emerald-100"
                                                : "bg-zinc-900 text-zinc-600"
                                            }`}
                                          >
                                            {size.stock}
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

