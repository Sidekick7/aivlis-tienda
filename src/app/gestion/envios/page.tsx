"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Clipboard,
  ClipboardList,
  Copy,
  CreditCard,
  Images,
  LogOut,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  Save,
  Search,
  ShoppingBag,
  Truck,
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
  OrderStatus,
} from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type ShippingFilter =
  | "to_prepare"
  | "prepared"
  | "shipped"
  | "delivered"
  | "pickup"
  | "pending"
  | "all";

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

const shippingFilters: Array<{
  label: string;
  value: ShippingFilter;
}> = [
  { label: "Por preparar", value: "to_prepare" },
  { label: "Preparados", value: "prepared" },
  { label: "Despachados", value: "shipped" },
  { label: "Entregados", value: "delivered" },
  { label: "Retiros", value: "pickup" },
  { label: "Pendientes", value: "pending" },
  { label: "Todos", value: "all" },
];

const fulfillmentStatuses: Array<{
  label: string;
  value: OrderFulfillmentStatus;
}> = [
  { label: "Por preparar", value: "to_prepare" },
  { label: "Preparado", value: "prepared" },
  { label: "Despachado", value: "shipped" },
  { label: "Entregado", value: "delivered" },
];

const fulfillmentStatusLabels: Record<OrderFulfillmentStatus, string> = {
  to_prepare: "Por preparar",
  prepared: "Preparado",
  shipped: "Despachado",
  delivered: "Entregado",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Anulado",
};

function getShortOrderNumber(orderNumber: string) {
  return formatOrderNumber(orderNumber);
}

function getOrderItemsCount(order: AdminOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function getOrderDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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

function getOrderStatusClassName(order: AdminOrder) {
  if (order.status === "cancelled") {
    return "border-red-500/30 bg-red-500/15 text-red-200";
  }

  if (order.status === "pending_payment") {
    return "border-yellow-500/30 bg-yellow-500/15 text-yellow-200";
  }

  return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
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
  return {
    fulfillmentStatus: order.fulfillmentStatus,
    shippingCarrier: order.shippingCarrier || "",
    trackingNumber: order.trackingNumber || "",
    shippedAt: toDateTimeLocalValue(order.shippedAt),
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
    useState<ShippingFilter>("to_prepare");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<"customer" | "message" | null>(
    null
  );
  const [fulfillmentDraftOrderId, setFulfillmentDraftOrderId] =
    useState<string | null>(null);
  const [fulfillmentDraft, setFulfillmentDraft] =
    useState<FulfillmentDraft | null>(null);
  const [isSavingFulfillment, setIsSavingFulfillment] = useState(false);
  const [fulfillmentNotice, setFulfillmentNotice] = useState("");

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
    to_prepare: confirmedOrders.filter(
      (order) => order.fulfillmentStatus === "to_prepare"
    ).length,
    prepared: confirmedOrders.filter(
      (order) => order.fulfillmentStatus === "prepared"
    ).length,
    shipped: confirmedOrders.filter(
      (order) => order.fulfillmentStatus === "shipped"
    ).length,
    delivered: confirmedOrders.filter(
      (order) => order.fulfillmentStatus === "delivered"
    ).length,
    pickup: confirmedOrders.filter((order) => !isShippingOrder(order)).length,
    pending: orders.filter((order) => order.status === "pending_payment").length,
    all: orders.filter((order) => order.status !== "cancelled").length,
  };
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesFilter =
          activeFilter === "all"
            ? order.status !== "cancelled"
            : activeFilter === "pending"
              ? order.status === "pending_payment"
              : activeFilter === "pickup"
                ? order.status === "confirmed" && !isShippingOrder(order)
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

  const copyText = async (
    order: AdminOrder,
    action: "customer" | "message"
  ) => {
    const text = action === "customer" ? getCustomerText(order) : order.whatsappMessage;

    await navigator.clipboard.writeText(text);
    setCopiedAction(action);

    window.setTimeout(() => {
      setCopiedAction(null);
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
        ? new Date(selectedFulfillmentDraft.shippedAt).toISOString()
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

          <div className="mt-4 hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 lg:block">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Operacion
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              Preparacion de pedidos web, retiros y despachos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 hidden h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 lg:flex"
          >
            <LogOut size={16} />
            Salir
          </button>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col p-3">
          <header className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Gestion
                </p>
                <h1 className="text-2xl font-black text-white">Envios</h1>
              </div>

              <div className="grid gap-2 md:grid-cols-[minmax(260px,420px)_auto]">
                <label className="relative block">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar pedido, cliente, telefono o producto"
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void refreshOrders()}
                  disabled={isOrdersLoading}
                  className="h-10 rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isOrdersLoading ? "Cargando..." : "Actualizar"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex flex-wrap gap-2">
                {shippingFilters.map((filter) => {
                  const isActive = activeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                      className={`h-9 rounded-xl px-3 text-xs font-black transition ${
                        isActive
                          ? "bg-emerald-400 text-black"
                          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {filter.label}
                      <span className="ml-2 opacity-70">
                        {filterCounts[filter.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                <div className="rounded-xl bg-zinc-900 px-3 py-2">
                  <p className="text-zinc-500">Preparar</p>
                  <p className="text-lg text-white">{filterCounts.to_prepare}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 px-3 py-2">
                  <p className="text-zinc-500">Listos</p>
                  <p className="text-lg text-white">{filterCounts.prepared}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 px-3 py-2">
                  <p className="text-zinc-500">Desp.</p>
                  <p className="text-lg text-white">{filterCounts.shipped}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 px-3 py-2">
                  <p className="text-zinc-500">Retiro</p>
                  <p className="text-lg text-white">{filterCounts.pickup}</p>
                </div>
              </div>
            </div>
          </header>

          {ordersError && (
            <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {ordersError}
            </p>
          )}

          <div className="mt-3 grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#070707]">
              <div className="grid shrink-0 grid-cols-[92px_minmax(140px,1fr)_96px_minmax(160px,1.1fr)_82px_116px_92px] gap-2 border-b border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-bold uppercase text-zinc-400">
                <span>Pedido</span>
                <span>Cliente</span>
                <span className="text-center">Tipo</span>
                <span>Destino</span>
                <span className="text-center">Prendas</span>
                <span className="text-center">Logistica</span>
                <span className="text-center">Pedido</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
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

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`grid w-full grid-cols-[92px_minmax(140px,1fr)_96px_minmax(160px,1.1fr)_82px_116px_92px] items-center gap-2 border-b border-zinc-900 px-3 py-2 text-left transition ${
                        isSelected
                          ? "bg-emerald-400/10"
                          : "bg-[#080808] hover:bg-zinc-950"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-white">
                          {getShortOrderNumber(order.orderNumber)}
                        </p>
                        <p className="text-[11px] font-semibold text-zinc-500">
                          {getOrderDate(order.createdAt)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {order.customerName || "Cliente"}
                        </p>
                        <p className="truncate text-xs font-semibold text-zinc-500">
                          {order.customerWhatsapp || "Sin telefono"}
                        </p>
                      </div>

                      <span
                        className={`justify-self-center rounded-full px-2.5 py-1 text-xs font-black ${
                          deliveryType === "Envio"
                            ? "bg-sky-400/15 text-sky-200"
                            : "bg-emerald-400/15 text-emerald-200"
                        }`}
                      >
                        {deliveryType}
                      </span>

                      <p className="truncate text-sm font-semibold text-zinc-300">
                        {getOrderAddress(order)}
                      </p>

                      <p className="text-center text-sm font-black text-white">
                        {getOrderItemsCount(order)}
                      </p>

                      <span
                        className={`justify-self-center rounded-full border px-2 py-1 text-[11px] font-black ${getFulfillmentStatusClassName(order.fulfillmentStatus)}`}
                      >
                        {fulfillmentStatusLabels[order.fulfillmentStatus]}
                      </span>

                      <span
                        className={`justify-self-center rounded-full border px-2 py-1 text-[11px] font-black ${getOrderStatusClassName(order)}`}
                      >
                        {orderStatusLabels[order.status]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              {!selectedOrder ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
                  <div>
                    <PackageCheck
                      size={34}
                      className="mx-auto text-zinc-700"
                    />
                    <p className="mt-3 text-sm font-semibold text-zinc-500">
                      Selecciona un pedido para ver el detalle.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="shrink-0 border-b border-zinc-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                          Pedido
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-white">
                          {getShortOrderNumber(selectedOrder.orderNumber)}
                        </h2>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          isShippingOrder(selectedOrder)
                            ? "bg-sky-400/15 text-sky-200"
                            : "bg-emerald-400/15 text-emerald-200"
                        }`}
                      >
                        {getWebDeliveryType(selectedOrder)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(selectedOrder, "customer")}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800"
                      >
                        <Copy size={15} />
                        {copiedAction === "customer" ? "Copiado" : "Datos"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyText(selectedOrder, "message")}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800"
                      >
                        <Clipboard size={15} />
                        {copiedAction === "message" ? "Copiado" : "Mensaje"}
                      </button>
                      <button
                        type="button"
                        onClick={() => printOrder(selectedOrder)}
                        className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-black transition hover:bg-zinc-200"
                      >
                        <Printer size={15} />
                        Imprimir comprobante
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="grid gap-3">
                      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase text-zinc-500">
                            Logistica
                          </p>
                          {selectedFulfillmentDraft && (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${getFulfillmentStatusClassName(selectedFulfillmentDraft.fulfillmentStatus)}`}
                            >
                              {
                                fulfillmentStatusLabels[
                                  selectedFulfillmentDraft.fulfillmentStatus
                                ]
                              }
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
                              className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-white outline-none transition focus:border-zinc-400"
                            >
                              {fulfillmentStatuses.map((status) => (
                                <option
                                  key={status.value}
                                  value={status.value}
                                >
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>

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
                                placeholder={
                                  isShippingOrder(selectedOrder)
                                    ? "Correo / expreso"
                                    : "Retiro showroom"
                                }
                                className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
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
                                placeholder="Codigo / comprobante"
                                className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                              />
                            </label>
                          </div>

                          <label className="grid gap-1">
                            <span className="text-[11px] font-bold uppercase text-zinc-500">
                              Fecha de despacho
                            </span>
                            <input
                              type="datetime-local"
                              value={selectedFulfillmentDraft?.shippedAt ?? ""}
                              onChange={(event) =>
                                updateSelectedFulfillmentDraft((currentDraft) => ({
                                  ...currentDraft,
                                  shippedAt: event.target.value,
                                }))
                              }
                              className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-zinc-400"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => void saveFulfillment()}
                            disabled={
                              isSavingFulfillment ||
                              selectedOrder.status === "pending_payment"
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save size={15} />
                            {isSavingFulfillment
                              ? "Guardando..."
                              : "Guardar logistica"}
                          </button>

                          {fulfillmentNotice && (
                            <p className="rounded-xl bg-emerald-400/15 px-3 py-2 text-sm font-bold text-emerald-200">
                              {fulfillmentNotice}
                            </p>
                          )}
                        </div>
                      </section>

                      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <p className="mb-2 text-xs font-black uppercase text-zinc-500">
                          Cliente
                        </p>
                        <div className="grid gap-2 text-sm">
                          <p className="font-black text-white">
                            {selectedOrder.customerName || "Sin nombre"}
                          </p>
                          <p className="flex items-center gap-2 font-semibold text-zinc-300">
                            <Phone size={15} />
                            {selectedOrder.customerWhatsapp || "Sin telefono"}
                          </p>
                          <p className="flex items-start gap-2 font-semibold text-zinc-300">
                            <MapPin
                              size={15}
                              className="mt-0.5 shrink-0"
                            />
                            <span>{getOrderAddress(selectedOrder)}</span>
                          </p>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase text-zinc-500">
                            Productos
                          </p>
                          <p className="text-sm font-black text-white">
                            {formatPrice(selectedOrder.total)}
                          </p>
                        </div>

                        <div className="grid gap-2">
                          {selectedOrder.items.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[44px_minmax(0,1fr)_36px] items-center gap-2 rounded-xl bg-zinc-950 p-2"
                            >
                              <div className="relative h-12 w-11 overflow-hidden rounded-lg bg-zinc-900">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                    <PackageCheck size={16} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">
                                  {item.productName}
                                </p>
                                <p className="truncate text-xs font-semibold text-zinc-500">
                                  {item.productSku?.replace("AIV-", "") || "-"} ·{" "}
                                  {item.variantColor || "-"} · {item.size || "-"}
                                </p>
                              </div>

                              <p className="text-center text-sm font-black text-white">
                                x{item.quantity}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      {selectedOrder.notes && (
                        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
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
    </main>
  );
}
