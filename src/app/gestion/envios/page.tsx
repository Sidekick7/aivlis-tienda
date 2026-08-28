"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Copy,
  CreditCard,
  Images,
  LogOut,
  PackageCheck,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { printWebOrderReceipt } from "@/lib/localSaleReceipt";
import {
  getAdminOrders,
  updateOrderFulfillment,
} from "@/lib/orders";
import { formatOrderNumber } from "@/lib/orderNumber";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import type {
  AdminOrder,
  OrderFulfillmentStatus,
} from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type ShippingFilter =
  | "active"
  | "to_prepare"
  | "prepared"
  | "completed";

type FulfillmentDraft = {
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingCarrier: string;
  trackingNumber: string;
  shippedAt: string;
};

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
  },
  {
    title: "Envios",
    href: "/gestion/envios",
    icon: Truck,
    active: true,
  },
  {
    title: "Inventario",
    href: "/gestion/inventario",
    icon: Boxes,
  },
  {
    title: "Caja",
    href: "/gestion/caja",
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

const shippingFilters: Array<{
  label: string;
  value: ShippingFilter;
}> = [
  { label: "En curso", value: "active" },
  { label: "Por armar", value: "to_prepare" },
  { label: "Preparado", value: "prepared" },
  { label: "Finalizados", value: "completed" },
];

const shippingFulfillmentStatuses: Array<{
  label: string;
  value: OrderFulfillmentStatus;
}> = [
  { label: "Por armar", value: "to_prepare" },
  { label: "Preparado", value: "prepared" },
  { label: "Despachado", value: "shipped" },
];

const pickupFulfillmentStatuses: Array<{
  label: string;
  value: OrderFulfillmentStatus;
}> = [
  { label: "Por armar", value: "to_prepare" },
  { label: "Preparado", value: "prepared" },
  { label: "Retirado", value: "delivered" },
];

const shippingTableColumns =
  "grid-cols-[112px_minmax(140px,1fr)_82px_minmax(170px,1.3fr)_68px_112px]";
const shippingHeaderCellClass =
  "flex min-h-10 items-center border-r border-zinc-800 px-2 last:border-r-0";
const shippingRowCellClass =
  "flex min-h-[58px] items-center border-r border-zinc-800 px-2 last:border-r-0";

function getShortOrderNumber(orderNumber: string) {
  return formatOrderNumber(orderNumber);
}

function getOrderItemsCount(order: AdminOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function getOrderDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getOrderTime(value: string) {
  return `${new Date(value).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} hs`;
}

function toDateLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getWebDeliveryType(order: AdminOrder) {
  const lines = order.whatsappMessage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const deliveryIndex = lines.findIndex((line) => line === "ENTREGA");
  const deliveryLine =
    deliveryIndex >= 0
      ? lines[deliveryIndex + 1]?.replace(": sin costo", "")
      : "";

  if (deliveryLine) {
    return deliveryLine.toLowerCase().includes("retiro")
      ? "Retiro presencial"
      : "Envio";
  }

  return order.customerAddress ? "Envio" : "Retiro presencial";
}

function isShippingOrder(order: AdminOrder) {
  return getWebDeliveryType(order) === "Envio";
}

function getFulfillmentStatusLabel(
  status: OrderFulfillmentStatus,
  isPickup: boolean
) {
  if (status === "to_prepare") return "Por armar";
  if (status === "prepared") return "Preparado";
  if (status === "delivered") return isPickup ? "Retirado" : "Despachado";
  return isPickup ? "Preparado" : "Despachado";
}

function getOrderAddress(order: AdminOrder) {
  if (!isShippingOrder(order)) {
    return "Yerbal 3160, Flores, CABA";
  }

  return [
    order.customerAddress,
    order.customerCity,
    order.customerProvince,
    order.customerZip ? `CP ${order.customerZip}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function getFulfillmentStatusClassName(status: OrderFulfillmentStatus) {
  if (status === "delivered") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  }

  if (status === "shipped") {
    return "border-sky-500/30 bg-sky-500/15 text-sky-200";
  }

  if (status === "prepared") {
    return "border-violet-500/30 bg-violet-500/15 text-violet-200";
  }

  return "border-yellow-500/30 bg-yellow-500/15 text-yellow-200";
}

function getOrderSearchText(order: AdminOrder) {
  return [
    order.orderNumber,
    formatOrderNumber(order.orderNumber),
    order.customerName,
    order.customerWhatsapp,
    order.customerDni,
    order.customerAddress,
    order.customerCity,
    order.customerProvince,
    order.items.map((item) => item.productName).join(" "),
    order.items.map((item) => item.productSku || "").join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function getCustomerText(order: AdminOrder) {
  return [
    `Pedido: ${formatOrderNumber(order.orderNumber)}`,
    `Entrega: ${getWebDeliveryType(order)}`,
    `Nombre: ${order.customerName}`,
    `DNI/CUIT: ${order.customerDni}`,
    `WhatsApp: ${order.customerWhatsapp}`,
    `Direccion: ${getOrderAddress(order)}`,
    `Email: ${order.customerEmail || "-"}`,
    `Notas: ${order.notes || "-"}`,
  ].join("\n");
}

function getOrderFulfillmentDraft(order: AdminOrder): FulfillmentDraft {
  const isPickup = !isShippingOrder(order);

  return {
    fulfillmentStatus:
      isPickup && order.fulfillmentStatus === "shipped"
        ? "prepared"
        : !isPickup && order.fulfillmentStatus === "delivered"
        ? "shipped"
        : order.fulfillmentStatus,
    shippingCarrier: isPickup ? "" : order.shippingCarrier || "",
    trackingNumber: isPickup ? "" : order.trackingNumber || "",
    shippedAt: isPickup ? "" : toDateLocalValue(order.shippedAt),
  };
}

export default function GestionEnviosPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ShippingFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  const [isCustomerDataCopied, setIsCustomerDataCopied] = useState(false);
  const [fulfillmentDraftOrderId, setFulfillmentDraftOrderId] =
    useState<string | null>(null);
  const [fulfillmentDraft, setFulfillmentDraft] =
    useState<FulfillmentDraft | null>(null);
  const [isSavingFulfillment, setIsSavingFulfillment] = useState(false);
  const [fulfillmentNotice, setFulfillmentNotice] = useState("");

  useEffect(() => {
    if (!fulfillmentNotice) return;

    const timeoutId = window.setTimeout(() => {
      setFulfillmentNotice("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [fulfillmentNotice]);

  useEffect(() => {
    if (!isCustomerDetailsOpen) return;

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCustomerDetailsOpen(false);
    };

    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [isCustomerDetailsOpen]);

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

  const refreshOrders = async () => {
    setIsOrdersLoading(true);
    setOrdersError("");

    try {
      const nextOrders = await getAdminOrders();
      setOrders(nextOrders);
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los envios."
      );
    } finally {
      setIsOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;

    queueMicrotask(() => {
      void refreshOrders();
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
  };

  const confirmedOrders = orders.filter(
    (order) => order.status === "confirmed"
  );
  const filterCounts: Record<ShippingFilter, number> = {
    active: confirmedOrders.filter(
      (order) =>
        order.fulfillmentStatus === "to_prepare" ||
        order.fulfillmentStatus === "prepared" ||
        (!isShippingOrder(order) && order.fulfillmentStatus === "shipped")
    ).length,
    to_prepare: confirmedOrders.filter(
      (order) => order.fulfillmentStatus === "to_prepare"
    ).length,
    prepared: confirmedOrders.filter(
      (order) =>
        order.fulfillmentStatus === "prepared" ||
        (!isShippingOrder(order) &&
          order.fulfillmentStatus === "shipped")
    ).length,
    completed: confirmedOrders.filter(
      (order) =>
        (isShippingOrder(order) &&
          (order.fulfillmentStatus === "shipped" ||
            order.fulfillmentStatus === "delivered")) ||
        (!isShippingOrder(order) && order.fulfillmentStatus === "delivered")
    ).length,
  };
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesFilter =
          activeFilter === "active"
            ? order.status === "confirmed" &&
              (order.fulfillmentStatus === "to_prepare" ||
                order.fulfillmentStatus === "prepared" ||
                (!isShippingOrder(order) &&
                  order.fulfillmentStatus === "shipped"))
            : activeFilter === "completed"
              ? order.status === "confirmed" &&
                ((isShippingOrder(order) &&
                  (order.fulfillmentStatus === "shipped" ||
                    order.fulfillmentStatus === "delivered")) ||
                  (!isShippingOrder(order) &&
                    order.fulfillmentStatus === "delivered"))
              : activeFilter === "prepared"
                ? order.status === "confirmed" &&
                  (order.fulfillmentStatus === "prepared" ||
                    (!isShippingOrder(order) &&
                      order.fulfillmentStatus === "shipped"))
              : order.status === "confirmed" &&
                order.fulfillmentStatus === activeFilter;
        const matchesSearch =
          !normalizedSearch || getOrderSearchText(order).includes(normalizedSearch);

        return matchesFilter && matchesSearch;
      })
      .sort(
        (firstOrder, secondOrder) =>
          new Date(secondOrder.createdAt).getTime() -
          new Date(firstOrder.createdAt).getTime()
      );
  }, [activeFilter, normalizedSearch, orders]);
  const selectedOrder =
    visibleOrders.find((order) => order.id === selectedOrderId) ||
    visibleOrders[0] ||
    null;
  const selectedFulfillmentDraft =
    selectedOrder &&
    fulfillmentDraftOrderId === selectedOrder.id &&
    fulfillmentDraft
      ? fulfillmentDraft
      : selectedOrder
        ? getOrderFulfillmentDraft(selectedOrder)
        : null;
  const updateSelectedFulfillmentDraft = (
    updater: (currentDraft: FulfillmentDraft) => FulfillmentDraft
  ) => {
    if (!selectedOrder) return;

    setFulfillmentDraftOrderId(selectedOrder.id);
    setFulfillmentNotice("");
    setFulfillmentDraft((currentDraft) =>
      updater(
        fulfillmentDraftOrderId === selectedOrder.id && currentDraft
          ? currentDraft
          : getOrderFulfillmentDraft(selectedOrder)
      )
    );
  };

  const copyCustomerData = async (order: AdminOrder) => {
    await navigator.clipboard.writeText(getCustomerText(order));
    setIsCustomerDataCopied(true);

    window.setTimeout(() => {
      setIsCustomerDataCopied(false);
    }, 1800);
  };

  const printOrder = (order: AdminOrder) => {
    const receiptWindow = window.open("", "_blank", "width=420,height=720");

    if (!receiptWindow) {
      setOrdersError("No se pudo abrir la ventana de impresion.");
      return;
    }

    printWebOrderReceipt({
      printWindow: receiptWindow,
      order,
      deliveryLabel: getWebDeliveryType(order),
    });
  };

  const saveFulfillment = async () => {
    if (!selectedOrder || isSavingFulfillment) return;

    setIsSavingFulfillment(true);
    setOrdersError("");
    setFulfillmentNotice("");

    try {
      if (!selectedFulfillmentDraft) return;

      const shippedAtValue = selectedFulfillmentDraft.shippedAt
        ? new Date(
            `${selectedFulfillmentDraft.shippedAt.slice(0, 10)}T12:00:00`
          ).toISOString()
        : "";

      await updateOrderFulfillment(selectedOrder.id, {
        ...selectedFulfillmentDraft,
        shippedAt: shippedAtValue,
      });

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,
                fulfillmentStatus:
                  selectedFulfillmentDraft.fulfillmentStatus,
                shippingCarrier:
                  selectedFulfillmentDraft.shippingCarrier.trim() || null,
                trackingNumber:
                  selectedFulfillmentDraft.trackingNumber.trim() || null,
                shippedAt: shippedAtValue || null,
                updatedAt: new Date().toISOString(),
              }
            : order
        )
      );
      setFulfillmentNotice("Logistica actualizada.");
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la logistica."
      );
    } finally {
      setIsSavingFulfillment(false);
    }
  };

  if (isAuthLoading || isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
        <p className="text-sm text-zinc-400">Cargando envios...</p>
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

          <h1 className="mt-3 text-4xl font-bold">Envios</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entra con las mismas credenciales del admin para preparar pedidos,
            retiros y despachos.
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

          {authMessage && <p className="mt-4 text-sm text-zinc-400">{authMessage}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#090909] text-white">
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

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 hidden h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 lg:flex"
          >
            <LogOut size={16} />
            Salir
          </button>
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden px-2 py-2">
          <header className="flex shrink-0 flex-col gap-2 border border-zinc-800 bg-zinc-950 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black text-white">Envios</h1>
              <div
                className="flex items-center gap-1 border-l border-zinc-800 pl-3"
                role="group"
                aria-label="Filtrar envios"
              >
                {shippingFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`inline-flex h-8 cursor-pointer items-center gap-1.5 px-2.5 text-xs font-black transition ${
                      filter.value === "to_prepare"
                        ? activeFilter === filter.value
                          ? "rounded-full border border-amber-300 bg-amber-300 text-black"
                          : "rounded-full border border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                        : filter.value === "prepared"
                          ? activeFilter === filter.value
                            ? "rounded-full border border-violet-300 bg-violet-300 text-black"
                            : "rounded-full border border-violet-400/40 bg-violet-400/15 text-violet-200 hover:bg-violet-400/25"
                          : activeFilter === filter.value
                            ? "rounded-md bg-white text-black"
                            : "rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    {filter.label}
                    <span className="opacity-75">
                      {filterCounts[filter.value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <label className="relative min-w-[240px] max-w-[380px] flex-1 lg:flex-none lg:w-[360px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar pedido, cliente, SKU o producto"
                  className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-400"
                />
              </label>

              <button
                type="button"
                onClick={() => void refreshOrders()}
                disabled={isOrdersLoading}
                title="Actualizar pedidos"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={isOrdersLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </header>

          {ordersError && (
            <p className="fixed left-1/2 top-4 z-50 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-950/95 px-4 py-3 text-center text-sm font-semibold text-red-100 shadow-2xl">
              {ordersError}
            </p>
          )}

          {fulfillmentNotice && (
            <p className="pointer-events-none fixed left-1/2 top-4 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-emerald-950/95 px-4 py-3 text-center text-sm font-semibold text-emerald-100 shadow-2xl">
              {fulfillmentNotice}
            </p>
          )}

          <div className="grid min-h-0 flex-1 overflow-hidden border-x border-b border-zinc-800 bg-[#080808] xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden xl:border-r xl:border-zinc-800">
              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                <div
                  className={`sticky top-0 z-10 grid ${shippingTableColumns} border-b border-zinc-800 bg-zinc-900 text-[11px] font-bold uppercase text-zinc-400`}
                >
                  <span className={shippingHeaderCellClass}>Pedido</span>
                  <span className={shippingHeaderCellClass}>Cliente</span>
                  <span className={`${shippingHeaderCellClass} justify-center`}>
                    Tipo
                  </span>
                  <span className={shippingHeaderCellClass}>Destino</span>
                  <span className={`${shippingHeaderCellClass} justify-center`}>
                    Prendas
                  </span>
                  <span className={`${shippingHeaderCellClass} justify-center`}>
                    Logistica
                  </span>
                </div>

                {isOrdersLoading && (
                  <p className="p-5 text-sm font-semibold text-zinc-500">
                    Cargando pedidos...
                  </p>
                )}

                {!isOrdersLoading && visibleOrders.length === 0 && (
                  <p className="p-5 text-center text-sm font-semibold text-zinc-500">
                    No hay pedidos para este filtro.
                  </p>
                )}

                {visibleOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const deliveryType = getWebDeliveryType(order);
                  const visibleFulfillmentStatus =
                    !isShippingOrder(order) &&
                    order.fulfillmentStatus === "shipped"
                      ? "prepared"
                      : isShippingOrder(order) &&
                          order.fulfillmentStatus === "delivered"
                        ? "shipped"
                        : order.fulfillmentStatus;

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`grid w-full cursor-pointer ${shippingTableColumns} border-b border-zinc-800 text-left transition ${
                        isSelected
                          ? "bg-emerald-400/10"
                          : "bg-[#0b0b0b] hover:bg-zinc-900"
                      }`}
                    >
                      <div className={shippingRowCellClass}>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white">
                            {getShortOrderNumber(order.orderNumber)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold">
                            <span className="text-zinc-500">Fecha</span>
                            <span className="text-zinc-300">
                              {getOrderDate(order.createdAt)}
                            </span>
                          </p>
                          <p className="flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold">
                            <span className="text-zinc-500">Hora</span>
                            <span className="text-zinc-300">
                              {getOrderTime(order.createdAt)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className={`${shippingRowCellClass} min-w-0`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {order.customerName || "Cliente"}
                          </p>
                          <p className="truncate text-xs font-semibold text-zinc-500">
                            {order.customerWhatsapp || "Sin telefono"}
                          </p>
                        </div>
                      </div>

                      <div className={`${shippingRowCellClass} justify-center`}>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-black ${
                            deliveryType === "Envio"
                              ? "bg-sky-400/15 text-sky-200"
                              : "bg-emerald-400/15 text-emerald-200"
                          }`}
                        >
                          {deliveryType}
                        </span>
                      </div>

                      <div className={`${shippingRowCellClass} min-w-0`}>
                        <p className="truncate text-xs font-semibold text-zinc-300">
                          {getOrderAddress(order)}
                        </p>
                      </div>

                      <div className={`${shippingRowCellClass} justify-center`}>
                        <span className="text-sm font-black text-white">
                          {getOrderItemsCount(order)}
                        </span>
                      </div>

                      <div className={`${shippingRowCellClass} justify-center`}>
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-black ${getFulfillmentStatusClassName(visibleFulfillmentStatus)}`}
                        >
                          {getFulfillmentStatusLabel(
                            visibleFulfillmentStatus,
                            !isShippingOrder(order)
                          )}
                        </span>
                      </div>

                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden bg-zinc-950">
              {!selectedOrder ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
                  <div>
                    <PackageCheck size={30} className="mx-auto text-zinc-700" />
                    <p className="mt-2 text-sm font-semibold text-zinc-500">
                      Selecciona un pedido.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black text-white">
                          {getShortOrderNumber(selectedOrder.orderNumber)}
                          </h2>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              isShippingOrder(selectedOrder)
                                ? "bg-sky-400/15 text-sky-200"
                                : "bg-emerald-400/15 text-emerald-200"
                            }`}
                          >
                            {getWebDeliveryType(selectedOrder)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
                          {selectedOrder.customerName}
                        </p>
                      </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsCustomerDetailsOpen(true)}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-black text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
                      >
                        <UserRound size={15} />
                        Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => printOrder(selectedOrder)}
                        title="Imprimir comprobante"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white text-black transition hover:bg-zinc-200"
                      >
                        <Printer size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div>
                      <section className="border-b border-zinc-800 px-3 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase text-zinc-500">
                            Logistica
                          </p>
                          {selectedFulfillmentDraft && (
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-black ${getFulfillmentStatusClassName(selectedFulfillmentDraft.fulfillmentStatus)}`}
                            >
                              {getFulfillmentStatusLabel(
                                selectedFulfillmentDraft.fulfillmentStatus,
                                !isShippingOrder(selectedOrder)
                              )}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <label className="grid gap-1">
                            <span className="text-[11px] font-bold uppercase text-zinc-500">
                              Estado
                            </span>
                            <select
                              value={
                                selectedFulfillmentDraft?.fulfillmentStatus ??
                                "to_prepare"
                              }
                              onChange={(event) =>
                                updateSelectedFulfillmentDraft((currentDraft) => ({
                                  ...currentDraft,
                                  fulfillmentStatus: event.target
                                    .value as OrderFulfillmentStatus,
                                }))
                              }
                              className="h-9 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm font-bold text-white outline-none transition focus:border-zinc-400"
                            >
                              {(isShippingOrder(selectedOrder)
                                ? shippingFulfillmentStatuses
                                : pickupFulfillmentStatuses
                              ).map((status) => (
                                <option
                                  key={status.value}
                                  value={status.value}
                                >
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {isShippingOrder(selectedOrder) && (
                            <div className="grid gap-2 sm:grid-cols-2">
                            <label className="grid gap-1">
                              <span className="text-[11px] font-bold uppercase text-zinc-500">
                                Transporte
                              </span>
                              <input
                                type="text"
                                value={
                                  selectedFulfillmentDraft?.shippingCarrier ?? ""
                                }
                                onChange={(event) =>
                                  updateSelectedFulfillmentDraft((currentDraft) => ({
                                    ...currentDraft,
                                    shippingCarrier: event.target.value,
                                  }))
                                }
                                placeholder="Correo / expreso"
                                className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                              />
                            </label>

                            <label className="grid gap-1">
                              <span className="text-[11px] font-bold uppercase text-zinc-500">
                                Seguimiento
                              </span>
                              <input
                                type="text"
                                value={
                                  selectedFulfillmentDraft?.trackingNumber ?? ""
                                }
                                onChange={(event) =>
                                  updateSelectedFulfillmentDraft((currentDraft) => ({
                                    ...currentDraft,
                                    trackingNumber: event.target.value,
                                  }))
                                }
                                placeholder="Codigo"
                                className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                              />
                            </label>
                            </div>
                          )}

                          <div
                            className={
                              isShippingOrder(selectedOrder)
                                ? "grid grid-cols-[150px_minmax(0,1fr)] items-end gap-2"
                                : "grid"
                            }
                          >
                            {isShippingOrder(selectedOrder) && (
                              <label className="grid gap-1">
                                <span className="text-[11px] font-bold uppercase text-zinc-500">
                                  Fecha de despacho
                                </span>
                                <input
                                  type="date"
                                  value={selectedFulfillmentDraft?.shippedAt ?? ""}
                                  onChange={(event) =>
                                    updateSelectedFulfillmentDraft(
                                      (currentDraft) => ({
                                        ...currentDraft,
                                        shippedAt: event.target.value,
                                      })
                                    )
                                  }
                                  className="h-9 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-zinc-400"
                                />
                              </label>
                            )}

                            <button
                              type="button"
                              onClick={() => void saveFulfillment()}
                              disabled={
                                isSavingFulfillment ||
                                selectedOrder.status === "pending_payment"
                              }
                              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-400 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Save size={15} />
                              {isSavingFulfillment
                                ? "Guardando..."
                                : "Guardar"}
                            </button>
                          </div>

                        </div>
                      </section>

                      <section className="border-b border-zinc-800">
                        <div className="flex items-center justify-between gap-3 px-3 py-2">
                          <p className="text-xs font-black uppercase text-zinc-500">
                            Productos
                          </p>
                          <p className="text-sm font-black text-white">
                            {formatPrice(selectedOrder.total)}
                          </p>
                        </div>

                        <div className="border-t border-zinc-800">
                          {selectedOrder.items.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[42px_minmax(0,1fr)_44px] items-center border-b border-zinc-800 px-3 py-2 last:border-b-0"
                            >
                              <div className="relative h-11 w-9 overflow-hidden rounded bg-zinc-900">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    fill
                                    sizes="36px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                    <PackageCheck size={16} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 px-2">
                                <p className="truncate text-sm font-bold text-white">
                                  {item.productName}
                                </p>
                                <p className="truncate text-xs font-semibold text-zinc-500">
                                  SKU {item.productSku?.replace("AIV-", "") || "-"}
                                  {" / "}
                                  {item.variantColor || "-"}
                                  {" / Talle "}
                                  {item.size || "-"}
                                </p>
                              </div>

                              <p className="flex h-full items-center justify-center border-l border-zinc-800 text-center text-sm font-black text-white">
                                x{item.quantity}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      {selectedOrder.notes && (
                        <section className="px-3 py-3">
                          <p className="mb-1 text-xs font-black uppercase text-zinc-500">
                            Notas
                          </p>
                          <p className="whitespace-pre-wrap text-sm font-semibold text-zinc-300">
                            {selectedOrder.notes}
                          </p>
                        </section>
                      )}
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </section>
      </div>

      {isCustomerDetailsOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCustomerDetailsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-details-title"
            className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
              <div>
                <h2
                  id="customer-details-title"
                  className="text-lg font-black text-white"
                >
                  Datos del cliente
                </h2>
                <p className="text-xs font-semibold text-zinc-500">
                  Pedido {getShortOrderNumber(selectedOrder.orderNumber)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerDetailsOpen(false)}
                title="Cerrar"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid sm:grid-cols-2">
              {[
                ["Nombre", selectedOrder.customerName || "Sin nombre"],
                ["DNI / CUIT", selectedOrder.customerDni || "Sin dato"],
                [
                  "WhatsApp",
                  selectedOrder.customerWhatsapp || "Sin telefono",
                ],
                ["Correo", selectedOrder.customerEmail || "Sin correo"],
                ["Localidad", selectedOrder.customerCity || "Sin dato"],
                ["Provincia", selectedOrder.customerProvince || "Sin dato"],
                ["Codigo postal", selectedOrder.customerZip || "Sin dato"],
                ["Entrega", getWebDeliveryType(selectedOrder)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-zinc-800 px-4 py-3 sm:odd:border-r"
                >
                  <p className="text-[10px] font-bold uppercase text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-zinc-100">
                    {value}
                  </p>
                </div>
              ))}

              <div className="border-b border-zinc-800 px-4 py-3 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase text-zinc-500">
                  Direccion
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-zinc-100">
                  {selectedOrder.customerAddress || "Sin direccion"}
                </p>
              </div>

              <div className="px-4 py-3 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase text-zinc-500">
                  Notas
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-zinc-100">
                  {selectedOrder.notes || "Sin notas"}
                </p>
              </div>
            </div>

            <footer className="flex justify-end border-t border-zinc-800 px-4 py-3">
              <button
                type="button"
                onClick={() => void copyCustomerData(selectedOrder)}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-black transition hover:bg-zinc-200"
              >
                <Copy size={16} />
                {isCustomerDataCopied ? "Datos copiados" : "Copiar datos"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
