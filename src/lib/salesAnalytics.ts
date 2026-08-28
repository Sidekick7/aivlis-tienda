import type { LocalSale } from "@/types/localSale";
import type { AdminOrder } from "@/types/order";

export type SalesPeriod = "today" | "7" | "30" | "all";
export type CompletedSaleSource = "web" | "local";
export type CompletedSalePayment = "Efectivo" | "Transferencia" | "Mixto";

export type CompletedSaleItem = {
  productSku?: string | null;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

export type CompletedSale = {
  id: string;
  number: string;
  source: CompletedSaleSource;
  customer: string;
  payment: CompletedSalePayment;
  total: number;
  cost: number;
  profit: number;
  units: number;
  createdAt: string;
  items: CompletedSaleItem[];
};

function getWebPayment(order: AdminOrder): CompletedSalePayment {
  const text = [order.whatsappMessage, order.notes]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  if (
    text.includes("forma de pago: efectivo") ||
    text.includes("pago: efectivo") ||
    text.includes("pago\nefectivo")
  ) {
    return "Efectivo";
  }

  return "Transferencia";
}

function getLocalPayment(
  paymentMethod: LocalSale["paymentMethod"]
): CompletedSalePayment {
  if (paymentMethod === "cash") return "Efectivo";
  if (paymentMethod === "mixed") return "Mixto";
  return "Transferencia";
}

function getSaleTotals(items: CompletedSaleItem[]) {
  return items.reduce(
    (totals, item) => ({
      cost: totals.cost + item.unitCost * item.quantity,
      units: totals.units + item.quantity,
    }),
    { cost: 0, units: 0 }
  );
}

export function buildCompletedSales(
  orders: AdminOrder[],
  localSales: LocalSale[]
): CompletedSale[] {
  const webSales = orders
    .filter((order) => order.status === "confirmed")
    .map<CompletedSale>((order) => {
      const items = order.items.map<CompletedSaleItem>((item) => ({
        productSku: item.productSku,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.subtotal,
      }));
      const totals = getSaleTotals(items);

      return {
        id: order.id,
        number: order.orderNumber,
        source: "web",
        customer: order.customerName || "Cliente web",
        payment: getWebPayment(order),
        total: order.total,
        cost: totals.cost,
        profit: order.total - totals.cost,
        units: totals.units,
        createdAt: order.createdAt,
        items,
      };
    });

  const storeSales = localSales
    .filter((sale) => sale.status === "completed")
    .map<CompletedSale>((sale) => {
      const items = sale.items.map<CompletedSaleItem>((item) => ({
        productSku: item.productSku,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.subtotal,
      }));
      const totals = getSaleTotals(items);

      return {
        id: sale.id,
        number: sale.saleNumber,
        source: "local",
        customer: "Consumidor final",
        payment: getLocalPayment(sale.paymentMethod),
        total: sale.total,
        cost: totals.cost,
        profit: sale.total - totals.cost,
        units: totals.units,
        createdAt: sale.createdAt,
        items,
      };
    });

  return [...webSales, ...storeSales].sort(
    (firstSale, secondSale) =>
      new Date(secondSale.createdAt).getTime() -
      new Date(firstSale.createdAt).getTime()
  );
}

export function isSaleWithinPeriod(value: string, period: SalesPeriod) {
  if (period === "all") return true;

  const saleDate = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period !== "today") {
    start.setDate(start.getDate() - (Number(period) - 1));
  }

  return saleDate >= start;
}

export function getShortSaleNumber(value: string) {
  const segments = value.split("-").filter(Boolean);
  const lastSegment = segments.at(-1) || value;
  return `#${lastSegment.slice(-6)}`;
}
