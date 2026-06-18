import { formatPrice } from "@/lib/pricing";
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
}) {
  if (!printWindow) return;

  const shortSaleNumber = getShortSaleNumber(saleNumber);
  const formattedDate = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt));
  const groupedItems = new Map<
    string,
    {
      productName: string;
      productSku?: string | null;
      variants: ReceiptItem[];
    }
  >();

  for (const item of items) {
    const groupKey = `${item.productId ?? item.productSlug}-${item.productSku ?? ""}-${item.productName}`;
    const currentGroup = groupedItems.get(groupKey);

    if (currentGroup) {
      currentGroup.variants.push(item);
    } else {
      groupedItems.set(groupKey, {
        productName: item.productName,
        productSku: item.productSku,
        variants: [item],
      });
    }
  }

  const itemsHtml = Array.from(groupedItems.values())
    .map((group) => {
      const skuText = getShortSku(group.productSku);
      const variantRows = group.variants
        .map(
          (item) => `
            <tr>
              <td>
                <span class="variant-name">${escapeReceiptText(item.variantColor || "-")} / Talle ${escapeReceiptText(item.size || "-")}</span>
              </td>
              <td>${escapeReceiptText(item.quantity)}</td>
              <td>${escapeReceiptText(formatPrice(item.unitPrice))}</td>
              <td>${escapeReceiptText(formatPrice(item.subtotal))}</td>
            </tr>
          `
        )
        .join("");

      return `
        <tr class="product-row">
          <td colspan="4">
            <strong>${escapeReceiptText(group.productName)}</strong>
            ${skuText ? `<span>SKU ${escapeReceiptText(skuText)}</span>` : ""}
          </td>
        </tr>
        ${variantRows}
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
          .variant-name {
            color: #111;
            font-size: 11px;
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
                <th>Producto</th>
                <th>Cant.</th>
                <th>Unit.</th>
                <th>Subt.</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

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

export function printWebOrderReceipt({
  printWindow,
  order,
  deliveryLabel,
}: {
  printWindow: Window | null;
  order: AdminOrder;
  deliveryLabel: string;
}) {
  printSaleReceipt({
    printWindow,
    numberLabel: "Pedido",
    saleNumber: order.orderNumber,
    paymentLabel:
      order.status === "pending_payment" ? "Pendiente" : "Coordinado por WhatsApp",
    total: order.total,
    items: order.items,
    createdAt: order.createdAt,
    customerName: order.customerName,
    deliveryLabel,
  });
}
