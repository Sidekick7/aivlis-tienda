"use client";

import Image from "next/image";
import { Copy, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatOrderNumber } from "@/lib/orderNumber";
import type { AdminOrder, OrderStatus } from "@/types/order";

type OrderFilter = "all" | OrderStatus;
type OrderDateFilter = "all" | "today" | "last_7_days" | "this_month";
type OrderSort = "newest" | "oldest";

const ORDERS_PER_PAGE = 10;

type Props = {
  orders: AdminOrder[];
  isLoading: boolean;
  error: string;
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

const orderStatusButtonClasses: Record<OrderStatus, string> = {
  pending_payment:
    "border-yellow-500/30 bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/25",
  confirmed:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
  cancelled:
    "border-red-500/30 bg-red-500/15 text-red-200 hover:bg-red-500/25",
};

const orderStatusActionLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

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

  return deliveryLine?.replace("Entrega:", "").trim() || "";
}

export default function AdminOrdersSection({
  orders,
  isLoading,
  error,
  onRefresh,
  onStatusChange,
  onUpdateInternalNotes,
  onDelete,
  onDeleteMany,
}: Props) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] =
    useState<OrderFilter>("all");
  const [orderDateFilter, setOrderDateFilter] =
    useState<OrderDateFilter>("all");
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
      order.status === "confirmed"
        ? "Este pedido esta confirmado. Si lo eliminas, se devuelve el stock. Continuar?"
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

    const hasConfirmedOrder = selectedOrders.some(
      (order) => order.status === "confirmed"
    );
    const shouldDelete = window.confirm(
      hasConfirmedOrder
        ? `Vas a eliminar ${selectedOrders.length} pedidos. Los confirmados devuelven stock. Continuar?`
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
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const last7DaysStart = new Date(todayStart);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const visibleOrders = orders.filter((order) => {
    const matchesFilter =
      orderFilter === "all" || order.status === orderFilter;
    const orderDate = new Date(order.createdAt);
    const matchesDate =
      orderDateFilter === "all" ||
      (orderDateFilter === "today" && orderDate >= todayStart) ||
      (orderDateFilter === "last_7_days" && orderDate >= last7DaysStart) ||
      (orderDateFilter === "this_month" && orderDate >= monthStart);
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

  return (
    <section className="mt-10 bg-zinc-900 rounded-3xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">
            Pedidos
          </h2>

          <p className="text-zinc-400 mt-2">
            {visibleOrders.length} de {orders.length} tickets
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 outline-none transition focus:border-zinc-500"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="h-11 px-5 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition cursor-pointer"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["all", "Todos"],
          ["pending_payment", "Pendientes"],
          ["confirmed", "Confirmados"],
          ["cancelled", "Cancelados"],
        ] as [OrderFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setOrderFilter(value);
              setOrderPage(1);
            }}
            className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
              orderFilter === value
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-zinc-400">
          Ordenar por fecha
          <select
            value={orderSort}
            onChange={(event) => {
              setOrderSort(event.target.value as OrderSort);
              setOrderPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-white outline-none transition focus:border-zinc-500"
          >
            <option value="newest">Mas recientes primero</option>
            <option value="oldest">Mas antiguos primero</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-zinc-400">
          Filtrar por fecha
          <select
            value={orderDateFilter}
            onChange={(event) => {
              setOrderDateFilter(event.target.value as OrderDateFilter);
              setOrderPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-white outline-none transition focus:border-zinc-500"
          >
            <option value="all">Todos los dias</option>
            <option value="today">Hoy</option>
            <option value="last_7_days">Ultimos 7 dias</option>
            <option value="this_month">Este mes</option>
          </select>
        </label>
      </div>

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

      <div className="flex flex-col gap-3">
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

          return (
            <article
              key={order.id}
              className={`rounded-2xl p-3 ${
                isSelected
                  ? "bg-zinc-800 ring-1 ring-white/40"
                  : "bg-zinc-800"
              }`}
            >
              <div className="grid gap-3 xl:grid-cols-[minmax(320px,1fr)_auto_auto] xl:items-center">
                <div className="flex min-w-0 gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar pedido ${formatOrderNumber(order.orderNumber)}`}
                    checked={isSelected}
                    onChange={() => toggleOrderSelection(order.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-white"
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {formatOrderNumber(order.orderNumber)}
                      </h3>

                      <span
                        className={`text-xs px-3 py-1 rounded-full border ${orderStatusClasses[order.status]}`}
                      >
                        {orderStatusLabels[order.status]}
                      </span>

                      <span className="rounded-full bg-zinc-700 px-2 py-1 text-xs text-zinc-300">
                        {orderItemsCount} un.
                      </span>

                      {order.internalNotes && (
                        <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs text-sky-200">
                          Nota interna
                        </span>
                      )}

                      {fulfillmentLabel && (
                        <span className="rounded-full bg-zinc-700 px-2 py-1 text-xs text-zinc-300">
                          {fulfillmentLabel}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-zinc-400">
                      {new Date(order.createdAt).toLocaleString("es-AR")} - {currencyFormatter.format(order.total)}
                    </p>

                    <p className="mt-1 truncate text-sm text-zinc-300">
                      {order.customerName} - DNI {order.customerDni} - {order.customerWhatsapp}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-start">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOrderId((currentId) =>
                        currentId === order.id ? null : order.id
                      )
                    }
                    className="h-9 rounded-lg bg-zinc-700 px-3 text-xs font-semibold text-white transition hover:bg-zinc-600 cursor-pointer"
                  >
                    {isExpanded ? "Ocultar" : "Ver detalle"}
                  </button>

                  {(["pending_payment", "confirmed", "cancelled"] as OrderStatus[]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(order, status)}
                        disabled={
                          order.status === status || isSavingOrder
                        }
                        className={`h-9 rounded-lg border px-3 text-xs font-semibold transition cursor-pointer disabled:cursor-default ${
                          order.status === status
                            ? "bg-white text-black border-white"
                            : isSavingOrder
                              ? "border-zinc-600 bg-zinc-700 text-zinc-300"
                            : orderStatusButtonClasses[status]
                        }`}
                      >
                        {savingStatus?.orderId === order.id &&
                        savingStatus.status === status
                          ? "Guardando..."
                          : orderStatusActionLabels[status]}
                      </button>
                    )
                  )}
                </div>

                <div className="flex xl:justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order)}
                    disabled={deletingOrderId === order.id}
                    className="flex h-9 items-center gap-2 rounded-lg bg-red-500/15 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    {deletingOrderId === order.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 grid gap-3 border-t border-zinc-700 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-white">
                      Pedido {formatOrderNumber(order.orderNumber)}
                    </span>
                  </div>

                  <div className="grid gap-1 text-sm text-zinc-400 md:grid-cols-2">
                    <p>
                      {order.customerAddress}, {order.customerCity}, {order.customerProvince} ({order.customerZip})
                    </p>

                    <p>
                      WhatsApp: {order.customerWhatsapp}
                      {order.customerEmail ? ` - Email: ${order.customerEmail}` : ""}
                    </p>

                    {order.notes && (
                      <p className="text-zinc-300 md:col-span-2">
                        Nota: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingNoteOrderId((currentOrderId) =>
                          currentOrderId === order.id ? null : order.id
                        )
                      }
                      className="flex h-9 items-center gap-2 rounded-lg bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/25"
                    >
                      {isEditingInternalNote
                        ? "Ocultar nota"
                        : order.internalNotes
                          ? "Editar nota interna"
                          : "Nota interna"}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyOrderText(order, "customer")}
                      className="flex h-9 items-center gap-2 rounded-lg bg-zinc-700 px-3 text-xs font-semibold text-white transition hover:bg-zinc-600"
                    >
                      <Copy size={16} />
                      {copiedAction?.orderId === order.id &&
                      copiedAction.action === "customer"
                        ? "Copiado"
                        : "Copiar cliente"}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyOrderText(order, "message")}
                      className="flex h-9 items-center gap-2 rounded-lg bg-zinc-700 px-3 text-xs font-semibold text-white transition hover:bg-zinc-600"
                    >
                      <Copy size={16} />
                      {copiedAction?.orderId === order.id &&
                      copiedAction.action === "message"
                        ? "Copiado"
                        : "Copiar mensaje"}
                    </button>

                  </div>

                  {isEditingInternalNote && (
                    <div className="grid gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-3">
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
                        className="min-h-20 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white outline-none transition focus:border-zinc-500"
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

                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 border-t border-zinc-700 pt-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}

                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {item.productName}
                          </p>

                          {item.productSku && (
                            <p className="mt-1 w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300">
                              SKU {getShortSku(item.productSku)}
                            </p>
                          )}

                          <p className="text-zinc-400 text-sm">
                            {item.variantColor || "Sin color"} - Talle {item.size || "-"} - x{item.quantity}
                          </p>
                        </div>
                      </div>

                      <p className="text-zinc-300 font-semibold shrink-0">
                        {currencyFormatter.format(item.subtotal)}
                      </p>
                    </div>
                  ))}
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
    </section>
  );
}
