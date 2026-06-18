"use client";

import Image from "next/image";
import {
  Copy,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { formatOrderNumber } from "@/lib/orderNumber";
import type { AdminOrder, OrderStatus } from "@/types/order";

type OrderFilter = "all" | OrderStatus;
type OrderSort = "newest" | "oldest";

const ORDERS_PER_PAGE = 10;
const orderGridColumns =
  "xl:grid-cols-[90px_90px_minmax(170px,1fr)_72px_58px_88px_210px_36px]";

type Props = {
  orders: AdminOrder[];
  isLoading: boolean;
  error: string;
  forcedStatusFilter?: OrderFilter;
  onRefresh: () => void;
  onStatusChange: (
    order: AdminOrder,
    status: OrderStatus
  ) => Promise<void>;
  onUpdateInternalNotes: (
    orderId: string,
    internalNotes: string
  ) => Promise<void>;
  onDelete: (order: AdminOrder) => Promise<void>;
  onDeleteMany: (orders: AdminOrder[]) => Promise<void>;
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const orderStatusClasses: Record<OrderStatus, string> = {
  pending_payment: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

function getShortSku(sku?: string | null) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku;
}

function parseDateInput(value: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateButtonLabel(value: string, fallback: string) {
  const date = parseDateInput(value);

  return date
    ? date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
      })
    : fallback;
}

function formatCustomerData(order: AdminOrder) {
  return [
    `Pedido: ${formatOrderNumber(order.orderNumber)}`,
    `Nombre: ${order.customerName}`,
    `DNI/CUIT: ${order.customerDni}`,
    `WhatsApp: ${order.customerWhatsapp}`,
    `Direccion: ${order.customerAddress}`,
    `Localidad: ${order.customerCity}`,
    `Provincia: ${order.customerProvince}`,
    `Codigo Postal: ${order.customerZip}`,
    `Email: ${order.customerEmail || "-"}`,
    `Notas: ${order.notes || "-"}`,
  ].join("\n");
}

function getOrderFulfillmentLabel(order: AdminOrder) {
  const deliveryLine = order.notes
    ?.split("\n")
    .find((line) => line.startsWith("Entrega:"));
  const whatsappDeliveryLine = order.whatsappMessage
    ?.split("\n")
    .find(
      (line, index, lines) =>
        lines[index - 1]?.trim().toUpperCase() === "ENTREGA" &&
        line.trim()
    );

  const label = (
    deliveryLine?.replace("Entrega:", "").trim() ||
    whatsappDeliveryLine?.replace(": sin costo", "").trim() ||
    ""
  );

  if (!label) return "";

  return label.toLowerCase().includes("retiro") ? "Retiro" : "Envio";
}

export default function AdminOrdersSection({
  orders,
  isLoading,
  error,
  forcedStatusFilter,
  onRefresh,
  onStatusChange,
  onUpdateInternalNotes,
  onDelete,
  onDeleteMany,
}: Props) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] =
    useState<OrderFilter>("all");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [datePickerTarget, setDatePickerTarget] =
    useState<"from" | "to" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [orderSort, setOrderSort] =
    useState<OrderSort>("newest");
  const [orderPage, setOrderPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<{
    orderId: string;
    status: OrderStatus;
  } | null>(null);
  const [deletingOrderId, setDeletingOrderId] =
    useState<string | null>(null);
  const [isDeletingSelected, setIsDeletingSelected] =
    useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteOrderId, setSavingNoteOrderId] =
    useState<string | null>(null);
  const [editingNoteOrderId, setEditingNoteOrderId] =
    useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<{
    orderId: string;
    action: "customer" | "message";
  } | null>(null);
  const [customerModalOrder, setCustomerModalOrder] =
    useState<AdminOrder | null>(null);
  const openDatePicker = (target: "from" | "to") => {
    const selectedDate = parseDateInput(
      target === "from" ? orderDateFrom : orderDateTo
    );

    setCalendarMonth(selectedDate ?? new Date());
    setDatePickerTarget(target);
  };
  const selectCalendarDate = (date: Date) => {
    const value = formatDateInput(date);

    if (datePickerTarget === "from") {
      setOrderDateFrom(value);
    }

    if (datePickerTarget === "to") {
      setOrderDateTo(value);
    }

    setDatePickerTarget(null);
    setOrderPage(1);
  };

  const copyOrderText = async (
    order: AdminOrder,
    action: "customer" | "message"
  ) => {
    const text =
      action === "customer"
        ? formatCustomerData(order)
        : order.whatsappMessage;

    await navigator.clipboard.writeText(text);
    setCopiedAction({
      orderId: order.id,
      action,
    });

    window.setTimeout(() => {
      setCopiedAction((current) =>
        current?.orderId === order.id && current.action === action
          ? null
          : current
      );
    }, 1800);
  };

  const handleStatusChange = async (
    order: AdminOrder,
    status: OrderStatus
  ) => {
    if (savingStatus || order.status === status) return;

    setSavingStatus({
      orderId: order.id,
      status,
    });

    try {
      await onStatusChange(order, status);
    } finally {
      setSavingStatus(null);
    }
  };

  const handleDeleteOrder = async (order: AdminOrder) => {
    if (savingStatus || deletingOrderId || isDeletingSelected) return;

    const shouldDelete = window.confirm(
      order.status !== "cancelled"
        ? "Este pedido tiene stock reservado. Si lo eliminas, se devuelve el stock. Continuar?"
        : "Seguro que queres eliminar este pedido?"
    );

    if (!shouldDelete) return;

    setDeletingOrderId(order.id);

    try {
      await onDelete(order);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleDeleteSelectedOrders = async () => {
    if (savingStatus || deletingOrderId || isDeletingSelected) return;

    const selectedOrders = orders.filter((order) =>
      selectedOrderIds.includes(order.id)
    );

    if (selectedOrders.length === 0) return;

    const hasReservedOrder = selectedOrders.some(
      (order) => order.status !== "cancelled"
    );
    const shouldDelete = window.confirm(
      hasReservedOrder
        ? `Vas a eliminar ${selectedOrders.length} pedidos. Los pendientes o confirmados devuelven stock. Continuar?`
        : `Seguro que queres eliminar ${selectedOrders.length} pedidos?`
    );

    if (!shouldDelete) return;

    setIsDeletingSelected(true);

    try {
      await onDeleteMany(selectedOrders);
      setSelectedOrderIds([]);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleSaveInternalNotes = async (order: AdminOrder) => {
    if (savingNoteOrderId) return;

    const nextNotes = noteDrafts[order.id] ?? order.internalNotes ?? "";

    setSavingNoteOrderId(order.id);

    try {
      await onUpdateInternalNotes(order.id, nextNotes);
      setNoteDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[order.id];

        return nextDrafts;
      });
      setEditingNoteOrderId(null);
    } finally {
      setSavingNoteOrderId(null);
    }
  };

  const normalizedOrderSearch = orderSearch
    .trim()
    .toLowerCase();
  const orderDateFromValue = orderDateFrom
    ? new Date(`${orderDateFrom}T00:00:00`)
    : null;
  const orderDateToValue = orderDateTo
    ? new Date(`${orderDateTo}T23:59:59`)
    : null;

  const effectiveOrderFilter = forcedStatusFilter ?? orderFilter;
  const visibleOrders = orders.filter((order) => {
    const matchesFilter =
      effectiveOrderFilter === "all" || order.status === effectiveOrderFilter;
    const orderDate = new Date(order.createdAt);
    const matchesDate =
      (!orderDateFromValue || orderDate >= orderDateFromValue) &&
      (!orderDateToValue || orderDate <= orderDateToValue);
    const matchesSearch =
      !normalizedOrderSearch ||
      [
        order.orderNumber,
        formatOrderNumber(order.orderNumber),
        order.customerName,
        order.customerDni,
        order.customerWhatsapp,
        order.customerEmail ?? "",
        order.notes ?? "",
        order.internalNotes ?? "",
        ...order.items.flatMap((item) => [
          item.productName,
          item.productSku ?? "",
          item.variantColor ?? "",
          item.size ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedOrderSearch);

    return matchesFilter && matchesDate && matchesSearch;
  }).sort((firstOrder, secondOrder) => {
    const firstTime = new Date(firstOrder.createdAt).getTime();
    const secondTime = new Date(secondOrder.createdAt).getTime();

    return orderSort === "newest"
      ? secondTime - firstTime
      : firstTime - secondTime;
  });
  const totalOrderPages = Math.max(
    1,
    Math.ceil(visibleOrders.length / ORDERS_PER_PAGE)
  );
  const currentOrderPage = Math.min(orderPage, totalOrderPages);
  const paginatedOrders = visibleOrders.slice(
    (currentOrderPage - 1) * ORDERS_PER_PAGE,
    currentOrderPage * ORDERS_PER_PAGE
  );
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((currentIds) =>
      currentIds.includes(orderId)
        ? currentIds.filter((selectedId) => selectedId !== orderId)
        : [...currentIds, orderId]
    );
  };
  const pendingOrdersCount = orders.filter(
    (order) => order.status === "pending_payment"
  ).length;
  const statusFilterOptions: [OrderFilter, string][] = [
    ["all", "Todos"],
    ["pending_payment", `Pendientes (${pendingOrdersCount})`],
    ["confirmed", "Confirmados"],
    ["cancelled", "Cancelados"],
  ];
  const calendarMonthStart = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  );
  const calendarStart = new Date(calendarMonthStart);
  calendarStart.setDate(
    calendarStart.getDate() - ((calendarStart.getDay() + 6) % 7)
  );
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);

    return date;
  });

  return (
    <section className="grid h-full min-h-0 gap-4 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-3 sm:p-4">
      <div className="mb-3 grid shrink-0 gap-3 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">
            Bandeja de pedidos
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            {visibleOrders.length} de {orders.length} tickets
          </p>

          <p className="hidden">
            {visibleOrders.length} de {orders.length} tickets ·{" "}
          </p>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              type="search"
              placeholder="Buscar ticket, cliente o WhatsApp"
              value={orderSearch}
              onChange={(event) => {
                setOrderSearch(event.target.value);
                setOrderPage(1);
              }}
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 outline-none transition focus:border-zinc-500"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 cursor-pointer"
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {!forcedStatusFilter &&
              statusFilterOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setOrderFilter(value);
                    setOrderPage(1);
                  }}
                  className={`h-9 rounded-xl px-3 text-xs font-semibold transition cursor-pointer ${
                    orderFilter === value
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => openDatePicker("from")}
                className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:border-zinc-500 cursor-pointer"
              >
                Desde {formatDateButtonLabel(orderDateFrom, "-")}
              </button>

              {datePickerTarget === "from" && (
                <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="h-8 w-8 rounded-lg bg-zinc-800 text-sm font-bold text-white transition hover:bg-zinc-700"
                    >
                      {"<"}
                    </button>
                    <p className="text-sm font-semibold capitalize text-white">
                      {calendarMonth.toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="h-8 w-8 rounded-lg bg-zinc-800 text-sm font-bold text-white transition hover:bg-zinc-700"
                    >
                      {">"}
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zinc-500">
                    {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {calendarDays.map((date) => {
                      const value = formatDateInput(date);
                      const isSelected = value === orderDateFrom;
                      const isCurrentMonth =
                        date.getMonth() === calendarMonth.getMonth();

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => selectCalendarDate(date)}
                          className={`h-8 rounded-lg text-xs font-semibold transition ${
                            isSelected
                              ? "bg-white text-black"
                              : isCurrentMonth
                                ? "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                : "bg-transparent text-zinc-600 hover:bg-zinc-900"
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderDateFrom("");
                      setDatePickerTarget(null);
                      setOrderPage(1);
                    }}
                    className="mt-3 h-8 w-full rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
                  >
                    Quitar desde
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => openDatePicker("to")}
                className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:border-zinc-500 cursor-pointer"
              >
                Hasta {formatDateButtonLabel(orderDateTo, "-")}
              </button>

              {datePickerTarget === "to" && (
                <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="h-8 w-8 rounded-lg bg-zinc-800 text-sm font-bold text-white transition hover:bg-zinc-700"
                    >
                      {"<"}
                    </button>
                    <p className="text-sm font-semibold capitalize text-white">
                      {calendarMonth.toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="h-8 w-8 rounded-lg bg-zinc-800 text-sm font-bold text-white transition hover:bg-zinc-700"
                    >
                      {">"}
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zinc-500">
                    {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {calendarDays.map((date) => {
                      const value = formatDateInput(date);
                      const isSelected = value === orderDateTo;
                      const isCurrentMonth =
                        date.getMonth() === calendarMonth.getMonth();

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => selectCalendarDate(date)}
                          className={`h-8 rounded-lg text-xs font-semibold transition ${
                            isSelected
                              ? "bg-white text-black"
                              : isCurrentMonth
                                ? "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                : "bg-transparent text-zinc-600 hover:bg-zinc-900"
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderDateTo("");
                      setDatePickerTarget(null);
                      setOrderPage(1);
                    }}
                    className="mt-3 h-8 w-full rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
                  >
                    Quitar hasta
                  </button>
                </div>
              )}
            </div>

            <select
              aria-label="Ordenar pedidos"
              value={orderSort}
              onChange={(event) => {
                setOrderSort(event.target.value as OrderSort);
                setOrderPage(1);
              }}
              className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-white outline-none transition focus:border-zinc-500"
            >
              <option value="newest">Mas recientes</option>
              <option value="oldest">Mas antiguos</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setOrderSearch("");
                setOrderFilter("all");
                setOrderDateFrom("");
                setOrderDateTo("");
                setOrderSort("newest");
                setOrderPage(1);
              }}
              disabled={
                !orderSearch &&
                (forcedStatusFilter || orderFilter === "all") &&
                !orderDateFrom &&
                !orderDateTo &&
                orderSort === "newest"
              }
              className="h-9 rounded-xl bg-zinc-800 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="text-zinc-400">
          Cargando pedidos...
        </p>
      )}

      {!isLoading && orders.length === 0 && (
        <p className="text-zinc-400">
          Todavía no hay tickets cargados.
        </p>
      )}

      {!isLoading && orders.length > 0 && visibleOrders.length === 0 && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
          No hay pedidos que coincidan con los filtros.
        </p>
      )}

      {!isLoading && selectedOrderIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
          <span className="text-sm text-zinc-400">
            {selectedOrderIds.length} seleccionados
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="h-9 rounded-lg bg-zinc-800 px-3 text-xs font-semibold text-white transition hover:bg-zinc-700"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={handleDeleteSelectedOrders}
              disabled={isDeletingSelected}
              className="h-9 rounded-lg bg-red-500/15 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingSelected ? "Eliminando..." : "Eliminar seleccionados"}
            </button>
          </div>
        </div>
      )}

      <div className={`hidden ${orderGridColumns} gap-2 border-y border-zinc-800 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 xl:grid`}>
        <span>Fecha</span>
        <span>Pedido</span>
        <span>Cliente</span>
        <span>Entrega</span>
        <span>Items</span>
        <span>Importe</span>
        <span>Estado</span>
        <span />
      </div>

      <div className="flex flex-col gap-2 xl:gap-0">
        {paginatedOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const isSavingOrder =
            savingStatus?.orderId === order.id;
          const isSelected = selectedOrderIds.includes(order.id);
          const internalNoteValue =
            noteDrafts[order.id] ?? order.internalNotes ?? "";
          const hasInternalNoteChanges =
            internalNoteValue.trim() !== (order.internalNotes ?? "").trim();
          const isEditingInternalNote =
            editingNoteOrderId === order.id;
          const orderItemsCount = order.items.reduce(
            (total, item) => total + item.quantity,
            0
          );
          const fulfillmentLabel = getOrderFulfillmentLabel(order);
          const customerAddressLine = [
            order.customerAddress,
            order.customerCity,
            order.customerProvince,
            order.customerZip ? `CP ${order.customerZip}` : "",
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <article
              key={order.id}
              className={`rounded-2xl p-3 xl:rounded-none xl:border-b xl:border-zinc-800 ${
                isSelected
                  ? "bg-zinc-800 ring-1 ring-white/40"
                  : "bg-zinc-800 xl:bg-transparent xl:hover:bg-zinc-800/60"
              }`}
            >
              <div className={`grid gap-2 ${orderGridColumns} xl:items-center`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar pedido ${formatOrderNumber(order.orderNumber)}`}
                    checked={isSelected}
                    onChange={() => toggleOrderSelection(order.id)}
                    className="h-4 w-4 shrink-0 accent-white"
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">
                      Fecha
                    </p>
                    <p className="text-sm font-semibold text-zinc-200">
                      {new Date(order.createdAt).toLocaleDateString("es-AR")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(order.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">
                    Pedido
                  </p>
                  <p className="truncate font-semibold">
                    {formatOrderNumber(order.orderNumber)}
                  </p>
                  {order.internalNotes && (
                    <span className="mt-1 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                      Nota
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">
                    Cliente
                  </p>
                  <p className="truncate font-semibold text-zinc-100">
                    {order.customerName}
                  </p>
                  <p className="truncate text-xs text-zinc-400">
                    DNI {order.customerDni} · {order.customerWhatsapp}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">
                    Entrega
                  </p>
                  <span className="inline-flex rounded-full bg-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                    {fulfillmentLabel || "Sin dato"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">
                    Items
                  </p>
                  <p className="font-semibold text-zinc-100">
                    {orderItemsCount} un.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500 xl:hidden">
                    Importe
                  </p>
                  <p className="truncate font-semibold text-zinc-100">
                    {currencyFormatter.format(order.total)}
                  </p>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_68px] items-center gap-1.5">
                  <select
                    aria-label={`Estado del pedido ${formatOrderNumber(order.orderNumber)}`}
                    value={order.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as OrderStatus;

                      if (nextStatus !== order.status) {
                        void handleStatusChange(order, nextStatus);
                      }
                    }}
                    disabled={isSavingOrder}
                    className={`h-9 w-full rounded-lg border px-1.5 text-[11px] font-semibold outline-none transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${orderStatusClasses[order.status]}`}
                  >
                    {(["pending_payment", "confirmed", "cancelled"] as OrderStatus[]).map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                          className="bg-zinc-950 text-white"
                        >
                          {orderStatusLabels[status]}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOrderId((currentId) =>
                        currentId === order.id ? null : order.id
                      )
                    }
                    className="h-9 rounded-lg bg-zinc-700 px-2 text-[11px] font-semibold text-white transition hover:bg-zinc-600 cursor-pointer"
                  >
                    {isExpanded ? "Ocultar" : "Detalle"}
                  </button>

                  {isSavingOrder && (
                    <span className="col-span-2 inline-flex h-5 items-center text-xs font-semibold text-zinc-400">
                      Guardando...
                    </span>
                  )}
                </div>

                <div className="flex xl:justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order)}
                    disabled={deletingOrderId === order.id}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-200 transition hover:bg-red-500/25 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    title="Eliminar pedido"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 border-t border-zinc-700 pt-3">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="rounded-xl bg-zinc-900 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Contacto
                      </p>
                      <div className="mt-1 grid gap-0.5 text-sm">
                        <p className="font-semibold text-white">
                          {order.customerName}
                        </p>
                        <p className="text-zinc-400">
                          DNI {order.customerDni} · {order.customerWhatsapp}
                        </p>
                        {order.customerEmail && (
                          <p className="truncate text-zinc-400">
                            {order.customerEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Entrega
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {fulfillmentLabel || "Sin metodo cargado"}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        {customerAddressLine || "Sin direccion cargada"}
                      </p>
                      {order.notes && (
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
                          {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap content-start gap-2 xl:max-w-[320px] xl:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingNoteOrderId((currentOrderId) =>
                            currentOrderId === order.id ? null : order.id
                          )
                        }
                        className="h-9 rounded-lg bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/25 cursor-pointer"
                      >
                        {isEditingInternalNote
                          ? "Ocultar nota"
                          : order.internalNotes
                            ? "Editar nota"
                            : "Nota interna"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomerModalOrder(order)}
                        className="flex h-9 items-center gap-2 rounded-lg bg-zinc-700 px-3 text-xs font-semibold text-white transition hover:bg-zinc-600 cursor-pointer"
                      >
                        Cliente
                      </button>

                      <button
                        type="button"
                        onClick={() => copyOrderText(order, "message")}
                        className="flex h-9 items-center gap-2 rounded-lg bg-zinc-700 px-3 text-xs font-semibold text-white transition hover:bg-zinc-600 cursor-pointer"
                      >
                        <Copy size={15} />
                        {copiedAction?.orderId === order.id &&
                        copiedAction.action === "message"
                          ? "Copiado"
                          : "Mensaje"}
                      </button>
                    </div>
                  </div>

                  {isEditingInternalNote && (
                    <div className="mt-3 grid gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
                      <textarea
                        value={internalNoteValue}
                        onChange={(event) =>
                          setNoteDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [order.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Ej: esperando transferencia, retira el viernes..."
                        className="min-h-16 rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-white outline-none transition focus:border-zinc-500"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveInternalNotes(order)}
                          disabled={
                            savingNoteOrderId === order.id ||
                            !hasInternalNoteChanges
                          }
                          className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {savingNoteOrderId === order.id ? "Guardando..." : "Guardar nota"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 overflow-hidden rounded-xl border border-zinc-700">
                    <div className="hidden grid-cols-[90px_minmax(0,1fr)_170px_70px_110px] gap-3 bg-zinc-950 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 md:grid">
                      <span>SKU</span>
                      <span>Producto</span>
                      <span>Variante</span>
                      <span>Cant.</span>
                      <span className="text-right">Subtotal</span>
                    </div>

                    <div className="divide-y divide-zinc-800">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-2 p-3 md:grid-cols-[90px_minmax(0,1fr)_170px_70px_110px] md:items-center"
                        >
                          <p className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300">
                            {item.productSku ? getShortSku(item.productSku) : "-"}
                          </p>

                          <div className="flex min-w-0 items-center gap-3">
                            {item.imageUrl && (
                              <Image
                                src={item.imageUrl}
                                alt={item.productName}
                                width={44}
                                height={44}
                                className="h-11 w-11 rounded-lg object-cover"
                              />
                            )}

                            <p className="truncate text-sm font-semibold text-zinc-100">
                              {item.productName}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-400">
                            <span className="inline-flex items-center gap-1">
                              Color
                              <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-1 font-semibold text-zinc-300">
                                {item.variantColor || "-"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              Talle
                              <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-bold text-black">
                                {item.size || "-"}
                              </span>
                            </span>
                          </div>

                          <p className="hidden">
                            {item.variantColor || "Sin color"} · Talle {item.size || "-"}
                          </p>

                          <p className="text-sm font-semibold text-zinc-200">
                            x{item.quantity}
                          </p>

                          <p className="text-sm font-semibold text-zinc-100 md:text-right">
                            {currencyFormatter.format(item.subtotal)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!isLoading && visibleOrders.length > ORDERS_PER_PAGE && (
        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            Pagina {currentOrderPage} de {totalOrderPages} - Mostrando{" "}
            {paginatedOrders.length} de {visibleOrders.length}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setOrderPage((currentPage) =>
                  Math.max(1, currentPage - 1)
                )
              }
              disabled={currentOrderPage === 1}
              className="h-10 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>

            <button
              type="button"
              onClick={() =>
                setOrderPage((currentPage) =>
                  Math.min(totalOrderPages, currentPage + 1)
                )
              }
              disabled={currentOrderPage === totalOrderPages}
              className="h-10 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
      </div>

      {customerModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setCustomerModalOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Datos del cliente
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {customerModalOrder.customerName}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Pedido {formatOrderNumber(customerModalOrder.orderNumber)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCustomerModalOrder(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 transition hover:bg-zinc-700 hover:text-white cursor-pointer"
                aria-label="Cerrar datos del cliente"
              >
                x
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {[
                ["DNI/CUIT", customerModalOrder.customerDni],
                ["WhatsApp", customerModalOrder.customerWhatsapp],
                ["Email", customerModalOrder.customerEmail || "-"],
                ["Direccion", customerModalOrder.customerAddress || "-"],
                ["Localidad", customerModalOrder.customerCity || "-"],
                ["Provincia", customerModalOrder.customerProvince || "-"],
                ["Codigo postal", customerModalOrder.customerZip || "-"],
                ["Entrega", getOrderFulfillmentLabel(customerModalOrder) || "-"],
                ["Notas", customerModalOrder.notes || "-"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 rounded-xl bg-zinc-900 px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => copyOrderText(customerModalOrder, "customer")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 cursor-pointer"
              >
                <Copy size={16} />
                {copiedAction?.orderId === customerModalOrder.id &&
                copiedAction.action === "customer"
                  ? "Copiado"
                  : "Copiar datos"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
