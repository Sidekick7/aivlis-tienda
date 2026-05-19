"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useState } from "react";
import type { AdminOrder, OrderStatus } from "@/types/order";

type OrderFilter = "all" | OrderStatus;

type Props = {
  orders: AdminOrder[];
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
  onStatusChange: (
    order: AdminOrder,
    status: OrderStatus
  ) => void;
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

const orderStatusButtonClasses: Record<OrderStatus, string> = {
  pending_payment:
    "border-yellow-500/30 bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/25",
  confirmed:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
  cancelled:
    "border-red-500/30 bg-red-500/15 text-red-200 hover:bg-red-500/25",
};

export default function AdminOrdersSection({
  orders,
  isLoading,
  error,
  onRefresh,
  onStatusChange,
}: Props) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] =
    useState<OrderFilter>("all");
  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);

  const normalizedOrderSearch = orderSearch
    .trim()
    .toLowerCase();
  const visibleOrders = orders.filter((order) => {
    const matchesFilter =
      orderFilter === "all" || order.status === orderFilter;
    const matchesSearch =
      !normalizedOrderSearch ||
      [
        order.orderNumber,
        order.customerName,
        order.customerDni,
        order.customerWhatsapp,
        order.customerEmail ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedOrderSearch);

    return matchesFilter && matchesSearch;
  });

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
              onChange={(event) => setOrderSearch(event.target.value)}
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
            onClick={() => setOrderFilter(value)}
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

      <div className="flex flex-col gap-4">
        {visibleOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;

          return (
            <article
              key={order.id}
              className="bg-zinc-800 rounded-2xl p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr_1fr] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold">
                      {order.orderNumber}
                    </h3>

                    <span
                      className={`text-xs px-3 py-1 rounded-full border ${orderStatusClasses[order.status]}`}
                    >
                      {orderStatusLabels[order.status]}
                    </span>
                  </div>

                  <p className="text-zinc-400 mt-2">
                    {new Date(order.createdAt).toLocaleString("es-AR")} - {currencyFormatter.format(order.total)}
                  </p>

                  <p className="text-zinc-300 mt-4">
                    {order.customerName} - DNI {order.customerDni}
                  </p>

                  {isExpanded && (
                    <>
                      <p className="text-zinc-400 text-sm mt-1">
                        {order.customerAddress}, {order.customerCity}, {order.customerProvince} ({order.customerZip})
                      </p>

                      <p className="text-zinc-400 text-sm mt-1">
                        WhatsApp: {order.customerWhatsapp}
                        {order.customerEmail ? ` - Email: ${order.customerEmail}` : ""}
                      </p>

                      {order.notes && (
                        <p className="text-zinc-300 text-sm mt-3">
                          Nota: {order.notes}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div />

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOrderId((currentId) =>
                        currentId === order.id ? null : order.id
                      )
                    }
                    className="h-10 px-4 rounded-xl text-sm font-semibold bg-zinc-700 text-white hover:bg-zinc-600 transition cursor-pointer"
                  >
                    {isExpanded ? "Ocultar" : "Ver detalle"}
                  </button>

                  {(["pending_payment", "confirmed", "cancelled"] as OrderStatus[]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onStatusChange(order, status)}
                        disabled={order.status === status}
                        className={`h-10 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer disabled:cursor-default ${
                          order.status === status
                            ? "bg-white text-black border-white"
                            : orderStatusButtonClasses[status]
                        }`}
                      >
                        {orderStatusLabels[status]}
                      </button>
                    )
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-5 grid gap-3">
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
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                        )}

                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {item.productName}
                          </p>

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
    </section>
  );
}
