import { formatPrice } from "@/lib/pricing";
import { groupSaleItems } from "@/lib/saleItemGroups";
import type { AdminOrder, AdminOrderItem } from "@/types/order";
import type {
  LocalSaleItem,
  LocalSaleItemInput,
  LocalSalePaymentMethod,
} from "@/types/localSale";

const paymentLabels: Record<LocalSalePaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mixed: "Mixto",
};

function escapeReceiptText(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getShortSku(sku?: string | null) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku || "";
}

function getShortSaleNumber(saleNumber: string) {
  return saleNumber.split("-").at(-1) || saleNumber;
}

function getMessageAmount(message: string, label: string) {
  const line = message
    .split("\n")
    .find((messageLine) =>
      messageLine.trim().toLowerCase().startsWith(label.toLowerCase())
    );
  const rawAmount = line
    ?.slice(line.indexOf(":") + 1)
    .match(/\$?\s*([\d.]+(?:,\d{1,2})?)/)?.[1];

  if (!rawAmount) return 0;

  return Number(rawAmount.replaceAll(".", "").replace(",", ".")) || 0;
}

type ReceiptItem = LocalSaleItemInput | LocalSaleItem | AdminOrderItem;

function printSaleReceipt({
  printWindow,
  numberLabel,
  saleNumber,
  paymentLabel,
  total,
  items,
  createdAt = new Date().toISOString(),
  customerName,
  deliveryLabel,
  subtotal,
  charges = [],
}: {
  printWindow: Window | null;
  numberLabel: string;
  saleNumber: string;
  paymentLabel: string;
  total: number;
  items: ReceiptItem[];
  createdAt?: string;
  customerName?: string;
  deliveryLabel?: string;
  subtotal?: number;
  charges?: Array<{ label: string; amount: number }>;
}) {
  if (!printWindow) return;

  const shortSaleNumber = getShortSaleNumber(saleNumber);
  const formattedDate = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt));
  const visibleCharges = charges.filter((charge) => charge.amount > 0);
  const breakdownHtml =
    visibleCharges.length > 0 && subtotal !== undefined
      ? `
          <section class="summary">
            <div class="row">
              <span>Subtotal productos</span>
              <strong>${escapeReceiptText(formatPrice(subtotal))}</strong>
            </div>
            ${visibleCharges
              .map(
                (charge) => `
                  <div class="row">
                    <span>${escapeReceiptText(charge.label)}</span>
                    <strong>${escapeReceiptText(formatPrice(charge.amount))}</strong>
                  </div>
                `
              )
              .join("")}
          </section>
        `
      : "";
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
                    <span>${escapeReceiptText(item.variantColor || "-")} / Talle ${escapeReceiptText(item.size || "-")}</span>
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
            ${skuText ? `<span>SKU ${escapeReceiptText(skuText)}</span>` : ""}
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
            padding-top: 8px;
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
              <span>${escapeReceiptText(numberLabel)}</span>
              <strong>#${escapeReceiptText(shortSaleNumber)}</strong>
            </div>
            <div class="row">
              <span>Fecha</span>
              <strong>${escapeReceiptText(formattedDate)}</strong>
            </div>
            <div class="row">
              <span>Pago</span>
              <strong>${escapeReceiptText(paymentLabel)}</strong>
            </div>
            ${
              customerName
                ? `<div class="row"><span>Cliente</span><strong>${escapeReceiptText(customerName)}</strong></div>`
                : ""
            }
            ${
              deliveryLabel
                ? `<div class="row"><span>Entrega</span><strong>${escapeReceiptText(deliveryLabel)}</strong></div>`
                : ""
            }
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

export function printLocalSaleReceipt({
  printWindow,
  saleNumber,
  paymentMethod,
  total,
  items,
  createdAt = new Date().toISOString(),
}: {
  printWindow: Window | null;
  saleNumber: string;
  paymentMethod: LocalSalePaymentMethod;
  total: number;
  items: LocalSaleItemInput[];
  createdAt?: string;
}) {
  printSaleReceipt({
    printWindow,
    numberLabel: "Venta",
    saleNumber,
    paymentLabel: paymentLabels[paymentMethod],
    total,
    items,
    createdAt,
  });
}

export function getWebOrderChargeBreakdown(order: AdminOrder) {
  return {
    productsSubtotal: order.items.reduce(
      (subtotal, item) => subtotal + item.subtotal,
      0
    ),
    logisticsFee: getMessageAmount(
      order.whatsappMessage,
      "Logistica y embalaje:"
    ) ||
      getMessageAmount(
        order.whatsappMessage,
        "Embalaje y cadeteria:"
      ),
    transferSurcharge:
      getMessageAmount(
        order.whatsappMessage,
        "Recargo transferencia 5%:"
      ) ||
      getMessageAmount(order.whatsappMessage, "Transferencia 5%:"),
  };
}

export function printWebOrderReceipt({
  printWindow,
  order,
  deliveryLabel,
}: {
  printWindow: Window | null;
  order: AdminOrder;
  deliveryLabel: string;
}) {
  const { productsSubtotal, logisticsFee, transferSurcharge } =
    getWebOrderChargeBreakdown(order);

  printSaleReceipt({
    printWindow,
    numberLabel: "Pedido",
    saleNumber: order.orderNumber,
    paymentLabel:
      order.status === "pending_payment" ? "Pendiente" : "Transferencia",
    total: order.total,
    items: order.items,
    createdAt: order.createdAt,
    customerName: order.customerName,
    deliveryLabel,
    subtotal: productsSubtotal,
    charges: [
      { label: "Embalaje y cadeteria", amount: logisticsFee },
      { label: "Transferencia 5%", amount: transferSurcharge },
    ],
  });
}
