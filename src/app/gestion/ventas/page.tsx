"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  Images,
  LogOut,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import {
  deleteLocalSale,
  getLocalSales,
  updateLocalSaleStatus,
} from "@/lib/localSales";
import {
  downloadLocalSaleReceiptPdf,
  getLocalSaleChargeBreakdown,
  getWebOrderChargeBreakdown,
  printLocalSaleReceipt,
  printWebOrderReceipt,
} from "@/lib/localSaleReceipt";
import {
  deleteOrder,
  getAdminOrders,
  updateOrderStatus,
} from "@/lib/orders";
import { formatOrderNumber } from "@/lib/orderNumber";
import { formatPrice } from "@/lib/pricing";
import { groupSaleItems } from "@/lib/saleItemGroups";
import { supabase } from "@/lib/supabase";
import type { AdminOrder, OrderStatus } from "@/types/order";
import type { LocalSale } from "@/types/localSale";
import type { Session } from "@supabase/supabase-js";

type SaleSource = "all" | "web" | "local" | "pending" | "cancelled";
type SaleDateFilter = "all" | "today" | "yesterday" | "last_7_days";

type UnifiedSale =
  | {
      source: "web";
      id: string;
      number: string;
      customer: string;
      total: number;
      status: OrderStatus;
      payment: string;
      createdAt: string;
      itemsCount: number;
    }
  | {
      source: "local";
      id: string;
      number: string;
      customer: string;
      total: number;
      status: LocalSale["status"];
      payment: LocalSale["paymentMethod"];
      createdAt: string;
      itemsCount: number;
    };

type SaleActionModal =
  | {
      action: "delete-web" | "delete-local" | "cancel-local";
      sale: UnifiedSale;
    }
  | null;

const navItems = [
  {
    title: "Punto de venta",
    href: "/gestion/puntoventa",
    icon: ShoppingBag,
    featured: true,
  },
  {
    title: "Ventas",
    href: "/gestion/ventas",
    icon: ClipboardList,
    active: true,
  },
  {
    title: "Envios",
    href: "/gestion/envios",
    icon: Truck,
  },
  {
    title: "Inventario",
    href: "/gestion/inventario",
    icon: Boxes,
  },
  {
    title: "Caja",
    href: "/gestion",
    icon: CreditCard,
  },
  {
    title: "Estadisticas",
    href: "/gestion/estadisticas",
    icon: BarChart3,
  },
  {
    title: "Catalogo",
    href: "/gestion/catalogo",
    icon: Images,
  },
];

const sourceFilters: Array<{
  label: string;
  value: SaleSource;
}> = [
  { label: "Todos", value: "all" },
  { label: "Web", value: "web" },
  { label: "Local", value: "local" },
  { label: "Pendientes", value: "pending" },
  { label: "Anuladas", value: "cancelled" },
];

const dateFilters: Array<{
  label: string;
  value: SaleDateFilter;
}> = [
  { label: "Todo", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Ayer", value: "yesterday" },
  { label: "7 dias", value: "last_7_days" },
];

const paymentLabels: Record<LocalSale["paymentMethod"], string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mixed: "Mixto",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Anulada",
};

const localStatusLabels: Record<LocalSale["status"], string> = {
  completed: "Confirmada",
  reserved: "Reservada",
  cancelled: "Anulada",
};

function getSaleNumber(sale: UnifiedSale) {
  if (sale.source === "web") {
    return formatOrderNumber(sale.number);
  }

  const shortNumber = sale.number.split("-").at(-1) || sale.number;

  return shortNumber.startsWith("#") ? shortNumber : `#${shortNumber}`;
}

function getSaleStatusLabel(sale: UnifiedSale) {
  if (sale.source === "web") {
    return orderStatusLabels[sale.status];
  }

  return localStatusLabels[sale.status];
}

function isSaleCancelled(sale: UnifiedSale) {
  return sale.source === "web"
    ? sale.status === "cancelled"
    : sale.status === "cancelled";
}

function getSaleStatusClassName(sale: UnifiedSale) {
  if (isSaleCancelled(sale)) {
    return "border-red-500/30 bg-red-500/15 text-red-200";
  }

  if (sale.source === "web" && sale.status === "pending_payment") {
    return "border-yellow-500/30 bg-yellow-500/15 text-yellow-200";
  }

  if (sale.source === "local" && sale.status === "reserved") {
    return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  }

  return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
}

function getPaymentLabel(sale: UnifiedSale) {
  if (sale.source === "web") {
    const payment = sale.payment.trim();

    if (!payment || payment.toLowerCase() === "a coordinar") {
      return "Transferencia";
    }

    return payment;
  }

  return paymentLabels[sale.payment];
}

function getWebPaymentLabel(order: AdminOrder) {
  const text = [order.whatsappMessage, order.notes]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  if (
    text.includes("forma de pago: transferencia") ||
    text.includes("pago: transferencia") ||
    text.includes("pago\ntransferencia")
  ) {
    return "Transferencia";
  }

  if (
    text.includes("forma de pago: efectivo") ||
    text.includes("pago: efectivo") ||
    text.includes("pago\nefectivo")
  ) {
    return "Efectivo";
  }

  return "Transferencia";
}

function getWebCustomerNotes(order: Pick<AdminOrder, "notes">) {
  return (order.notes || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.toLowerCase().startsWith("entrega:") &&
        !line.toLowerCase().startsWith("pago:")
    )
    .join("\n");
}

type SaleDetailItem =
  | AdminOrder["items"][number]
  | LocalSale["items"][number];

function SaleItemsDetailTable({ items }: { items: SaleDetailItem[] }) {
  const groups = groupSaleItems(items);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <div className="grid grid-cols-[92px_minmax(0,1fr)_150px_90px_130px_110px] gap-3 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase text-zinc-500">
        <span>SKU</span>
        <span>Producto</span>
        <span>Variante</span>
        <span>Cantidad</span>
        <span>Precio</span>
        <span className="text-right">Subtotal</span>
      </div>

      <div className="divide-y divide-zinc-800">
        {groups.map((group) => {
          const firstItem = group.items[0];
          const colors = Array.from(
            new Set(group.items.map((item) => item.variantColor || "-"))
          );
          const unitPrices = new Set(
            group.items.map((item) => item.unitPrice)
          );

          return (
            <article key={group.key} className="px-3 py-2">
              <div className="grid grid-cols-[92px_minmax(0,1fr)_150px_90px_130px_110px] items-center gap-3 text-sm">
                <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300">
                  {group.productSku?.startsWith("AIV-")
                    ? group.productSku.slice(4)
                    : group.productSku || "-"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {group.productName}
                  </p>
                  {group.saleMode === "curve" && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {group.bundleQuantity}{" "}
                      {group.bundleQuantity === 1 ? "curva" : "curvas"} ·{" "}
                      {group.bundleQuantity * group.unitsPerBundle} prendas
                    </p>
                  )}
                </div>
                {group.saleMode === "unit" && group.items.length === 1 ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                    <span className="truncate font-semibold text-zinc-400">
                      {firstItem.variantColor || "-"}
                    </span>
                    <span className="text-zinc-600">Talle</span>
                    <span className="rounded-md bg-zinc-800 px-2 py-1 font-black text-white">
                      {firstItem.size || "-"}
                    </span>
                  </div>
                ) : (
                  <span className="truncate text-xs font-semibold text-zinc-400">
                    {colors.join(", ")}
                  </span>
                )}
                <span className="font-bold text-zinc-200">
                  x{group.bundleQuantity}
                </span>
                <span className="text-zinc-300">
                  {group.saleMode === "curve"
                    ? `Curva ${formatPrice(group.bundlePrice)}`
                    : unitPrices.size === 1
                      ? formatPrice(firstItem.unitPrice)
                      : "Variable"}
                </span>
                <span className="text-right font-bold text-white">
                  {formatPrice(group.subtotal)}
                </span>
              </div>

              {(group.saleMode === "curve" || group.items.length > 1) && (
                <div className="ml-[104px] mt-2 grid gap-1 border-l border-zinc-800 pl-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id || `${item.variantColor}-${item.size}`}
                      className="grid grid-cols-[minmax(0,1fr)_70px_110px] items-center gap-3 text-xs"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-zinc-400">
                        <span className="truncate">
                          {item.variantColor || "-"}
                        </span>
                        <span className="text-zinc-600">Talle</span>
                        <span className="rounded-md bg-zinc-800 px-2 py-1 font-black text-white">
                          {item.size || "-"}
                        </span>
                      </div>
                      <span className="font-bold text-zinc-300">
                        x{item.quantity}
                      </span>
                      <span className="text-right font-semibold text-zinc-300">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatSaleTableDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (firstDate: Date, secondDate: Date) =>
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();
  const time = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isSameDay(date, today)) {
    return `Hoy ${time}`;
  }

  if (isSameDay(date, yesterday)) {
    return `Ayer ${time}`;
  }

  return `${date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })} ${time}`;
}

function getDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function matchesDateFilter(value: string, filter: SaleDateFilter) {
  if (filter === "all") return true;

  const saleDate = new Date(value);
  const todayStart = getDayStart(new Date());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const last7DaysStart = new Date(todayStart);
  last7DaysStart.setDate(todayStart.getDate() - 6);

  if (filter === "today") {
    return saleDate >= todayStart && saleDate < tomorrowStart;
  }

  if (filter === "yesterday") {
    return saleDate >= yesterdayStart && saleDate < todayStart;
  }

  return saleDate >= last7DaysStart && saleDate < tomorrowStart;
}

export default function GestionVentasPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [localSales, setLocalSales] = useState<LocalSale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [salesNotice, setSalesNotice] = useState("");
  const [busySaleKey, setBusySaleKey] = useState("");
  const [saleActionModal, setSaleActionModal] =
    useState<SaleActionModal>(null);
  const [detailSale, setDetailSale] = useState<UnifiedSale | null>(null);
  const [copiedWebAction, setCopiedWebAction] = useState<
    "customer" | "message" | null
  >(null);
  const [webInfoModal, setWebInfoModal] = useState<
    "customer" | "message" | null
  >(null);
  const [activeFilter, setActiveFilter] = useState<SaleSource>("all");
  const [activeDateFilter, setActiveDateFilter] =
    useState<SaleDateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!salesNotice) return;

    const timeoutId = window.setTimeout(() => {
      setSalesNotice("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [salesNotice]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const checkAccess = async () => {
      if (!session) {
        setIsAllowed(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsAllowed(false);
      setIsCheckingAccess(true);

      const { data, error } = await supabase.rpc("is_admin");

      if (!isCurrent) return;

      if (error || data !== true) {
        await supabase.auth.signOut();

        if (!isCurrent) return;

        setSession(null);
        setAuthMessage("Este usuario no tiene permisos para Gestion.");
        setIsAllowed(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsAllowed(true);
      setIsCheckingAccess(false);
    };

    void checkAccess();

    return () => {
      isCurrent = false;
    };
  }, [session]);

  const refreshSales = async () => {
    setIsLoadingSales(true);
    setSalesError("");

    try {
      const [nextOrders, nextLocalSales] = await Promise.all([
        getAdminOrders(),
        getLocalSales(),
      ]);

      setOrders(nextOrders);
      setLocalSales(nextLocalSales);
    } catch (error) {
      setSalesError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las ventas."
      );
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;

    queueMicrotask(() => {
      void refreshSales();
    });
  }, [session, isAllowed]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setAuthMessage("");
    setIsSendingLogin(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    setIsSendingLogin(false);

    if (error) {
      setAuthMessage(`No se pudo iniciar sesion: ${error.message}`);
      return;
    }

    setAuthPassword("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOrders([]);
    setLocalSales([]);
  };

  const handleSaleStatusChange = async (
    sale: UnifiedSale,
    nextStatus: OrderStatus | LocalSale["status"]
  ) => {
    const saleKey = `${sale.source}-${sale.id}`;

    if (sale.status === nextStatus || busySaleKey) return;

    setBusySaleKey(saleKey);
    setSalesError("");
    setSalesNotice("");

    try {
      if (sale.source === "web") {
        const order = orders.find((currentOrder) => currentOrder.id === sale.id);

        if (!order) {
          throw new Error("No se encontro el pedido web.");
        }

        await updateOrderStatus(order, nextStatus as OrderStatus);
        setSalesNotice(`Venta web ${getSaleNumber(sale)} actualizada.`);
      } else {
        const localSale = localSales.find(
          (currentSale) => currentSale.id === sale.id
        );

        if (!localSale) {
          throw new Error("No se encontro la venta local.");
        }

        await updateLocalSaleStatus(
          localSale,
          nextStatus as LocalSale["status"]
        );
        setSalesNotice(`Venta local ${getSaleNumber(sale)} actualizada.`);
      }

      await refreshSales();
    } catch (error) {
      setSalesError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la venta."
      );
    } finally {
      setBusySaleKey("");
    }
  };

  const requestDeleteSale = (sale: UnifiedSale) => {
    if (busySaleKey) return;

    if (sale.source === "web") {
      setSaleActionModal({
        action: "delete-web",
        sale,
      });
      return;
    }

    setSaleActionModal({
      action: sale.status === "cancelled" ? "delete-local" : "cancel-local",
      sale,
    });
  };

  const handleModalAction = async () => {
    if (!saleActionModal) return;

    const { action, sale } = saleActionModal;
    const saleKey = `${sale.source}-${sale.id}`;

    if (busySaleKey) return;

    setBusySaleKey(saleKey);
    setSalesError("");
    setSalesNotice("");

    try {
      if (action === "delete-web" && sale.source === "web") {
        const order = orders.find((currentOrder) => currentOrder.id === sale.id);

        if (!order) {
          throw new Error("No se encontro el pedido web.");
        }

        await deleteOrder(order);
        setSalesNotice(`Venta web ${getSaleNumber(sale)} eliminada.`);
      }

      if (action === "cancel-local" && sale.source === "local") {
        const localSale = localSales.find(
          (currentSale) => currentSale.id === sale.id
        );

        if (!localSale) {
          throw new Error("No se encontro la venta local.");
        }

        await updateLocalSaleStatus(localSale, "cancelled");
        setSalesNotice(`Venta local ${getSaleNumber(sale)} anulada.`);
      }

      if (action === "delete-local" && sale.source === "local") {
        const localSale = localSales.find(
          (currentSale) => currentSale.id === sale.id
        );

        if (!localSale) {
          throw new Error("No se encontro la venta local.");
        }

        await deleteLocalSale(localSale);
        setSalesNotice(`Venta local ${getSaleNumber(sale)} eliminada.`);
      }

      await refreshSales();
      setSaleActionModal(null);
    } catch (error) {
      setSalesError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la venta."
      );
    } finally {
      setBusySaleKey("");
    }
  };

  const handleReprintLocalSale = (sale: LocalSale) => {
    const receiptWindow = window.open("", "_blank", "width=420,height=720");

    if (!receiptWindow) {
      setSalesError("No se pudo abrir la ventana de impresion.");
      return;
    }

    printLocalSaleReceipt({
      printWindow: receiptWindow,
      saleNumber: sale.saleNumber,
      paymentMethod: sale.paymentMethod,
      total: sale.total,
      items: sale.items,
      createdAt: sale.createdAt,
    });
  };

  const handleDownloadLocalSale = async (sale: LocalSale) => {
    setSalesError("");

    try {
      await downloadLocalSaleReceiptPdf({
        saleNumber: sale.saleNumber,
        paymentMethod: sale.paymentMethod,
        total: sale.total,
        items: sale.items,
        createdAt: sale.createdAt,
      });
    } catch (error) {
      setSalesError(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el comprobante."
      );
    }
  };

  const handlePrintWebOrder = (order: AdminOrder) => {
    const receiptWindow = window.open("", "_blank", "width=420,height=720");

    if (!receiptWindow) {
      setSalesError("No se pudo abrir la ventana de impresion.");
      return;
    }

    printWebOrderReceipt({
      printWindow: receiptWindow,
      order,
      deliveryLabel: getWebDeliveryType(order),
    });
  };

  const getWebCustomerText = (order: AdminOrder) =>
    [
      `Pedido: ${formatOrderNumber(order.orderNumber)}`,
      `Nombre: ${order.customerName}`,
      `DNI/CUIT: ${order.customerDni}`,
      `WhatsApp: ${order.customerWhatsapp}`,
      `Direccion: ${order.customerAddress}`,
      `Localidad: ${order.customerCity}`,
      `Provincia: ${order.customerProvince}`,
      `Codigo Postal: ${order.customerZip}`,
      `Email: ${order.customerEmail || "-"}`,
      `Entrega: ${getWebDeliveryType(order)}`,
      `Pago: ${getWebPaymentLabel(order)}`,
      `Notas: ${getWebCustomerNotes(order) || "-"}`,
    ].join("\n");

  const getWebDeliveryType = (order: AdminOrder) => {
    const lines = order.whatsappMessage
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const deliveryIndex = lines.findIndex((line) => line === "ENTREGA");
    const compactDeliveryLine = lines.find((line) =>
      line.toLowerCase().startsWith("entrega:")
    );
    const deliveryLine = compactDeliveryLine
      ? compactDeliveryLine.slice(compactDeliveryLine.indexOf(":") + 1).trim()
      : deliveryIndex >= 0
        ? lines[deliveryIndex + 1]?.replace(": sin costo", "")
        : "";

    if (deliveryLine) {
      return deliveryLine.toLowerCase().includes("retiro")
        ? "Retiro presencial"
        : "Envio";
    }

    return order.customerAddress ? "Envio" : "Retiro presencial";
  };

  const copyWebOrderText = async (
    order: AdminOrder,
    action: "customer" | "message"
  ) => {
    const text =
      action === "customer" ? getWebCustomerText(order) : order.whatsappMessage;

    await navigator.clipboard.writeText(text);
    setCopiedWebAction(action);

    window.setTimeout(() => {
      setCopiedWebAction(null);
    }, 1800);
  };

  const unifiedSales = useMemo<UnifiedSale[]>(() => {
    const webSales = orders.map<UnifiedSale>((order) => ({
      source: "web",
      id: order.id,
      number: order.orderNumber,
      customer: order.customerName || "Cliente web",
      total: order.total,
      status: order.status,
      payment: getWebPaymentLabel(order),
      createdAt: order.createdAt,
      itemsCount: order.items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    }));

    const localSaleRows = localSales.map<UnifiedSale>((sale) => ({
      source: "local",
      id: sale.id,
      number: sale.saleNumber,
      customer: "Consumidor final",
      total: sale.total,
      status: sale.status,
      payment: sale.paymentMethod,
      createdAt: sale.createdAt,
      itemsCount: sale.items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    }));

    return [...webSales, ...localSaleRows].sort(
      (firstSale, secondSale) =>
        new Date(secondSale.createdAt).getTime() -
        new Date(firstSale.createdAt).getTime()
    );
  }, [localSales, orders]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const dateFilteredSales = unifiedSales.filter((sale) =>
    matchesDateFilter(sale.createdAt, activeDateFilter)
  );
  const visibleSales = dateFilteredSales.filter((sale) => {
    const matchesFilter =
      activeFilter === "all" ||
      sale.source === activeFilter ||
      (activeFilter === "pending" &&
        ((sale.source === "web" && sale.status === "pending_payment") ||
          (sale.source === "local" && sale.status === "reserved"))) ||
      (activeFilter === "cancelled" &&
        isSaleCancelled(sale));

    const matchesSearch =
      !normalizedSearch ||
      [
        sale.number,
        getSaleNumber(sale),
        sale.customer,
        sale.source,
        getPaymentLabel(sale),
        getSaleStatusLabel(sale),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesFilter && matchesSearch;
  });

  const filterCounts: Record<SaleSource, number> = {
    all: dateFilteredSales.length,
    web: dateFilteredSales.filter((sale) => sale.source === "web").length,
    local: dateFilteredSales.filter((sale) => sale.source === "local").length,
    pending: dateFilteredSales.filter(
      (sale) =>
        (sale.source === "web" && sale.status === "pending_payment") ||
        (sale.source === "local" && sale.status === "reserved")
    ).length,
    cancelled: dateFilteredSales.filter(isSaleCancelled).length,
  };
  const detailOrder =
    detailSale?.source === "web"
      ? orders.find((order) => order.id === detailSale.id) ?? null
      : null;
  const detailLocalSale =
    detailSale?.source === "local"
      ? localSales.find((sale) => sale.id === detailSale.id) ?? null
      : null;
  const detailOrderCharges = detailOrder
    ? getWebOrderChargeBreakdown(detailOrder)
    : null;
  const detailLocalSaleCharges = detailLocalSale
    ? getLocalSaleChargeBreakdown(detailLocalSale)
    : null;

  if (isAuthLoading || isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <p className="text-sm font-semibold text-zinc-400">
          Cargando ventas...
        </p>
      </main>
    );
  }

  if (!session || !isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
            AIVLIS
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Ventas
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entra con las mismas credenciales del admin para revisar ventas web
            y ventas locales.
          </p>

          <input
            type="email"
            placeholder="tu@email.com"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            required
            className="mt-8 h-12 w-full rounded-xl bg-zinc-900 px-4 text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
          />

          <input
            type="password"
            placeholder="Contrasena"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            required
            className="mt-4 h-12 w-full rounded-xl bg-zinc-900 px-4 text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
          />

          <button
            type="submit"
            disabled={isSendingLogin}
            className="mt-4 h-12 w-full rounded-xl bg-white font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingLogin ? "Entrando..." : "Entrar"}
          </button>

          {authMessage && (
            <p className="mt-4 text-sm text-zinc-400">
              {authMessage}
            </p>
          )}
        </form>
      </main>
    );
  }

  const modalSale = saleActionModal?.sale ?? null;
  const webDeleteRestoresStock =
    saleActionModal?.action === "delete-web" &&
    modalSale?.source === "web" &&
    modalSale.status !== "cancelled";
  const modalTitle =
    saleActionModal?.action === "cancel-local"
      ? modalSale?.source === "local" && modalSale.status === "reserved"
        ? "Anular reserva"
        : "No se puede eliminar una venta confirmada"
      : saleActionModal?.action === "delete-local"
        ? "Eliminar venta anulada"
        : modalSale?.status === "pending_payment"
          ? "Eliminar pedido pendiente"
          : modalSale?.status === "confirmed"
            ? "Eliminar venta confirmada"
            : "Eliminar venta anulada";
  const modalBody =
    saleActionModal?.action === "cancel-local"
      ? modalSale?.source === "local" && modalSale.status === "reserved"
        ? "Al anular la reserva se devuelve el stock bloqueado. Despues vas a poder eliminarla del historial si hace falta."
        : "Primero hay que anular la venta para devolver el stock. Despues vas a poder eliminarla del historial si hace falta."
      : saleActionModal?.action === "delete-local"
        ? "Esto solo borra el registro del historial. No modifica stock porque la venta ya esta anulada."
        : webDeleteRestoresStock
          ? "Se eliminara el registro y se devolvera al inventario todo el stock reservado por esta venta. Esta accion no se puede deshacer."
          : "La venta ya esta anulada y su stock fue devuelto. Esto solo elimina el registro del historial.";
  const modalConfirmLabel =
    saleActionModal?.action === "cancel-local"
      ? "Anular venta"
      : webDeleteRestoresStock
        ? "Eliminar y devolver stock"
        : "Eliminar";

  return (
    <main className="h-screen overflow-hidden bg-[#090909] text-white">
      {salesNotice && (
        <div
          role="status"
          className="pointer-events-none fixed left-1/2 top-4 z-[80] w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-emerald-950/95 px-4 py-3 text-center text-sm font-semibold text-emerald-100 shadow-2xl shadow-black/50"
        >
          {salesNotice}
        </div>
      )}

      <div className="grid h-full min-h-0 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-800 bg-zinc-950 px-2 py-3 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link
              href="/"
              className="block text-xl font-bold tracking-[0.35em] transition hover:opacity-70"
            >
              AIVLIS
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 lg:hidden"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition lg:w-full ${
                    item.featured
                      ? "bg-emerald-400 text-black hover:bg-emerald-300"
                      : item.active
                        ? "bg-white text-black"
                        : "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden grid-cols-1 gap-2 lg:grid">
            <Link
              href="/admin"
              className="flex h-11 items-center gap-3 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <Settings size={18} />
              Admin catalogo
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-11 items-center gap-3 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden px-2 py-2">
          <header className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-2.5">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="relative min-w-0 md:w-[420px]">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar por numero, cliente, web o local"
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void refreshSales()}
                  className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Actualizar
                </button>
              </div>

              <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1.5">
                  <span className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Venta
                  </span>
                  {sourceFilters.map((filter) => {
                    const isActive = activeFilter === filter.value;

                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setActiveFilter(filter.value)}
                        className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                          isActive
                            ? "bg-white text-black"
                            : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        {filter.label}
                        {(filter.value === "pending" ||
                          filter.value === "cancelled") && (
                          <span className="ml-2 opacity-70">
                            {filterCounts[filter.value]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1.5">
                  <span className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Fecha
                  </span>
                  {dateFilters.map((filter) => {
                    const isActive = activeDateFilter === filter.value;

                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setActiveDateFilter(filter.value)}
                        className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                          isActive
                            ? "bg-emerald-400 text-black"
                            : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#070707] shadow-2xl shadow-black/20">
            <div className="grid shrink-0 grid-cols-[82px_96px_minmax(150px,1fr)_118px_106px_104px_126px_76px_88px_42px] gap-2 border-b border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-bold uppercase text-zinc-400">
              <span className="text-center">Origen</span>
              <span>Nro</span>
              <span>Cliente</span>
              <span className="text-center">Fecha</span>
              <span className="text-center">Total</span>
              <span className="text-center">Pago</span>
              <span className="text-center">Estado</span>
              <span className="text-center">Prendas</span>
              <span className="text-center">Detalle</span>
              <span></span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              {isLoadingSales && (
                <p className="p-4 text-sm text-zinc-400">
                  Cargando ventas...
                </p>
              )}

              {salesError && (
                <p className="m-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200">
                  {salesError}
                </p>
              )}

              {!isLoadingSales &&
                !salesError &&
                visibleSales.length === 0 && (
                  <p className="p-6 text-center text-sm text-zinc-400">
                    No hay ventas para este filtro.
                  </p>
                )}

              {!isLoadingSales &&
                !salesError &&
                visibleSales.map((sale, index) => (
                  <div
                    key={`${sale.source}-${sale.id}`}
                    className={`grid grid-cols-[82px_96px_minmax(150px,1fr)_118px_106px_104px_126px_76px_88px_42px] items-center gap-2 border-b border-zinc-900/80 px-3 py-2 text-sm transition hover:bg-zinc-800/45 ${
                      index % 2 === 0 ? "bg-zinc-950/45" : "bg-zinc-900/20"
                    }`}
                  >
                    <span
                      className={`mx-auto flex h-6 w-fit items-center rounded-full px-2 text-[11px] font-black ${
                        sale.source === "web"
                          ? "bg-sky-500/15 text-sky-200"
                          : "bg-emerald-500/15 text-emerald-200"
                      }`}
                    >
                      {sale.source === "web" ? "WEB" : "LOCAL"}
                    </span>
                    <span className="font-bold text-white">
                      {getSaleNumber(sale)}
                    </span>
                    <span className="truncate text-zinc-200">
                      {sale.customer}
                    </span>
                    <span className="flex h-full items-center justify-center text-center text-xs text-zinc-400">
                      {formatSaleTableDate(sale.createdAt)}
                    </span>
                    <span className="flex h-full items-center justify-center text-center font-black tabular-nums text-white">
                      {formatPrice(sale.total)}
                    </span>
                    <span className="flex h-full items-center justify-center text-center text-xs font-semibold text-zinc-400">
                      {getPaymentLabel(sale)}
                    </span>
                    <div className="flex h-full items-center justify-center">
                      <select
                        aria-label={`Estado de venta ${getSaleNumber(sale)}`}
                        value={sale.status}
                        disabled={busySaleKey === `${sale.source}-${sale.id}`}
                        onChange={(event) =>
                          void handleSaleStatusChange(
                            sale,
                            event.target.value as OrderStatus | LocalSale["status"]
                          )
                        }
                        className={`h-9 cursor-pointer rounded-lg border px-2 text-[11px] font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${getSaleStatusClassName(sale)}`}
                      >
                        {sale.source === "web"
                          ? (["pending_payment", "confirmed", "cancelled"] as OrderStatus[]).map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                  className="bg-zinc-950 text-white"
                                >
                                  {orderStatusLabels[status]}
                                </option>
                              )
                            )
                          : (["reserved", "completed", "cancelled"] as LocalSale["status"][]).map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                  className="bg-zinc-950 text-white"
                                >
                                  {localStatusLabels[status]}
                                </option>
                              )
                            )}
                      </select>
                    </div>
                    <span className="flex h-full items-center justify-center text-center text-zinc-300">
                      {sale.itemsCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailSale(sale);
                        setWebInfoModal(null);
                      }}
                      className="mx-auto h-9 cursor-pointer rounded-lg bg-zinc-800 px-3 text-xs font-bold text-zinc-200 transition hover:bg-zinc-700"
                    >
                      Detalle
                    </button>
                    <div className="flex h-full items-center justify-center">
                      <button
                        type="button"
                        onClick={() => requestDeleteSale(sale)}
                        disabled={busySaleKey === `${sale.source}-${sale.id}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-red-500/15 text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Eliminar venta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </section>
      </div>

      {saleActionModal && modalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">
                {modalSale.source === "web" ? "Venta web" : "Venta local"}{" "}
                {getSaleNumber(modalSale)}
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {modalTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {modalBody}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSaleActionModal(null)}
                disabled={busySaleKey === `${modalSale.source}-${modalSale.id}`}
                className="h-11 cursor-pointer rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleModalAction()}
                disabled={busySaleKey === `${modalSale.source}-${modalSale.id}`}
                className={`h-11 cursor-pointer rounded-xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  saleActionModal.action === "cancel-local"
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {busySaleKey === `${modalSale.source}-${modalSale.id}`
                  ? "Procesando..."
                  : modalConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {detailSale.source === "web" ? "Venta web" : "Venta local"}{" "}
                  {getSaleNumber(detailSale)}
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {detailSale.customer}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {new Date(detailSale.createdAt).toLocaleString("es-AR")} ·{" "}
                  {getPaymentLabel(detailSale)} · {formatPrice(detailSale.total)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {detailOrder && (
                  <button
                    type="button"
                    onClick={() => handlePrintWebOrder(detailOrder)}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                  >
                    <Printer size={15} />
                    Imprimir
                  </button>
                )}

                {detailLocalSale && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadLocalSale(detailLocalSale)
                      }
                      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-black transition hover:bg-emerald-300"
                    >
                      <Download size={15} />
                      Descargar PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReprintLocalSale(detailLocalSale)}
                      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                    >
                      <Printer size={15} />
                      Reimprimir
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDetailSale(null);
                    setWebInfoModal(null);
                  }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-zinc-300 transition hover:bg-zinc-800"
                  aria-label="Cerrar detalle"
                >
                  x
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {detailOrder && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Entrega
                    </span>
                    <span className="rounded-xl bg-zinc-800 px-3 py-1 text-sm font-bold text-white">
                      {getWebDeliveryType(detailOrder)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setWebInfoModal("customer")}
                      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-xl bg-zinc-800 px-3 text-xs font-bold text-zinc-200 transition hover:bg-zinc-700"
                    >
                      Datos del cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setWebInfoModal("message")}
                      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                    >
                      Mensaje de compra
                    </button>
                  </div>
                </div>
              )}

              {detailOrder && webInfoModal && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
                  onClick={() => setWebInfoModal(null)}
                >
                  <div
                    className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                          {webInfoModal === "customer"
                            ? "Datos del cliente"
                            : "Mensaje de compra"}
                        </p>
                        <h3 className="mt-1 text-xl font-black text-white">
                          {detailOrder.customerName}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setWebInfoModal(null)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-zinc-300 transition hover:bg-zinc-800"
                        aria-label="Cerrar informacion"
                      >
                        x
                      </button>
                    </div>

                    {webInfoModal === "customer" ? (
                      <div className="mt-4 grid gap-2 rounded-2xl bg-zinc-900 p-3 text-sm text-zinc-300">
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            Pedido
                          </span>
                          <span className="font-semibold text-white">
                            {formatOrderNumber(detailOrder.orderNumber)}
                          </span>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            DNI/CUIT
                          </span>
                          <span>{detailOrder.customerDni}</span>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            WhatsApp
                          </span>
                          <span>{detailOrder.customerWhatsapp}</span>
                        </div>
                        {detailOrder.customerEmail && (
                          <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                            <span className="font-bold text-zinc-500">
                              Email
                            </span>
                            <span>{detailOrder.customerEmail}</span>
                          </div>
                        )}
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            Entrega
                          </span>
                          <span>{getWebDeliveryType(detailOrder)}</span>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            Pago
                          </span>
                          <span>{getWebPaymentLabel(detailOrder)}</span>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            Direccion
                          </span>
                          <span>{detailOrder.customerAddress || "-"}</span>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <span className="font-bold text-zinc-500">
                            Localidad
                          </span>
                          <span>
                            {detailOrder.customerCity || "-"},{" "}
                            {detailOrder.customerProvince || "-"}{" "}
                            {detailOrder.customerZip || ""}
                          </span>
                        </div>
                        {getWebCustomerNotes(detailOrder) && (
                          <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                            <span className="font-bold text-zinc-500">
                              Notas
                            </span>
                            <span className="whitespace-pre-wrap">
                              {getWebCustomerNotes(detailOrder)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <pre className="mt-4 max-h-[56vh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-zinc-900 p-3 text-sm leading-relaxed text-zinc-200">
                        {detailOrder.whatsappMessage}
                      </pre>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void copyWebOrderText(detailOrder, webInfoModal)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-zinc-200"
                      >
                        <Copy size={16} />
                        {copiedWebAction === webInfoModal
                          ? "Copiado"
                          : "Copiar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detailLocalSale && detailLocalSaleCharges && (
                <>
                  <SaleItemsDetailTable items={detailLocalSale.items} />

                  <div className="ml-auto mt-3 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                    <div className="flex items-center justify-between gap-4 text-sm text-zinc-400">
                      <span>Subtotal productos</span>
                      <strong className="text-zinc-200">
                        {formatPrice(
                          detailLocalSaleCharges.productsSubtotal
                        )}
                      </strong>
                    </div>

                    {detailLocalSaleCharges.transferSurcharge > 0 && (
                      <div className="mt-2 flex items-center justify-between gap-4 text-sm text-zinc-400">
                        <span>Transferencia 5%</span>
                        <strong className="text-zinc-200">
                          {formatPrice(
                            detailLocalSaleCharges.transferSurcharge
                          )}
                        </strong>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-zinc-700 pt-3">
                      <span className="text-sm font-black uppercase text-white">
                        Total
                      </span>
                      <strong className="text-lg font-black text-white">
                        {formatPrice(detailLocalSale.total)}
                      </strong>
                    </div>
                  </div>
                </>
              )}

              {detailOrder && detailOrderCharges && (
                <>
                  <SaleItemsDetailTable items={detailOrder.items} />

                  <div className="ml-auto mt-3 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                    <div className="flex items-center justify-between gap-4 text-sm text-zinc-400">
                      <span>Subtotal productos</span>
                      <strong className="text-zinc-200">
                        {formatPrice(detailOrderCharges.productsSubtotal)}
                      </strong>
                    </div>

                    {detailOrderCharges.logisticsFee > 0 && (
                      <div className="mt-2 flex items-center justify-between gap-4 text-sm text-zinc-400">
                        <span>Embalaje y cadeteria</span>
                        <strong className="text-zinc-200">
                          {formatPrice(detailOrderCharges.logisticsFee)}
                        </strong>
                      </div>
                    )}

                    {detailOrderCharges.transferSurcharge > 0 && (
                      <div className="mt-2 flex items-center justify-between gap-4 text-sm text-zinc-400">
                        <span>Transferencia 5%</span>
                        <strong className="text-zinc-200">
                          {formatPrice(
                            detailOrderCharges.transferSurcharge
                          )}
                        </strong>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-zinc-700 pt-3">
                      <span className="text-sm font-black uppercase text-white">
                        Total
                      </span>
                      <strong className="text-lg font-black text-white">
                        {formatPrice(detailOrder.total)}
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
