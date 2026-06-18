"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  LogOut,
  Settings,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getLocalSales } from "@/lib/localSales";
import { getAdminOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import type { LocalSale } from "@/types/localSale";
import type { AdminOrder } from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type StatsRange = "7" | "30" | "all";
type StatsTab = "summary" | "products" | "payments" | "planned";

type UnifiedCompletedSale = {
  id: string;
  source: "web" | "local";
  total: number;
  createdAt: string;
  payment: string;
  items: Array<{
    productSku?: string | null;
    productName: string;
    quantity: number;
    subtotal: number;
  }>;
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
    href: "/gestion",
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
    active: true,
  },
];

const rangeLabels: Record<StatsRange, string> = {
  "7": "7 dias",
  "30": "30 dias",
  all: "Todo",
};

const statsTabs: Array<{
  label: string;
  value: StatsTab;
}> = [
  { label: "Resumen", value: "summary" },
  { label: "Productos", value: "products" },
  { label: "Cobros", value: "payments" },
  { label: "Preparado", value: "planned" },
];

const localPaymentLabels: Record<LocalSale["paymentMethod"], string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mixed: "Mixto",
};

function isWithinRange(value: string, range: StatsRange) {
  if (range === "all") return true;

  const date = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (Number(range) - 1));

  return date >= start;
}

function formatDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getShortSku(sku?: string | null) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku || "-";
}

export default function GestionEstadisticasPage() {
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
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [range, setRange] = useState<StatsRange>("30");
  const [activeTab, setActiveTab] = useState<StatsTab>("summary");

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

  const refreshStats = async () => {
    setIsLoadingStats(true);
    setStatsError("");

    try {
      const [nextOrders, nextLocalSales] = await Promise.all([
        getAdminOrders(),
        getLocalSales(),
      ]);

      setOrders(nextOrders);
      setLocalSales(nextLocalSales);
    } catch (error) {
      setStatsError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las estadisticas."
      );
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;

    queueMicrotask(() => {
      void refreshStats();
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

  const completedSales = useMemo<UnifiedCompletedSale[]>(() => {
    const webSales = orders
      .filter((order) => order.status === "confirmed")
      .map<UnifiedCompletedSale>((order) => ({
        id: order.id,
        source: "web",
        total: order.total,
        createdAt: order.createdAt,
        payment: "Web",
        items: order.items,
      }));
    const localCompletedSales = localSales
      .filter((sale) => sale.status === "completed")
      .map<UnifiedCompletedSale>((sale) => ({
        id: sale.id,
        source: "local",
        total: sale.total,
        createdAt: sale.createdAt,
        payment: localPaymentLabels[sale.paymentMethod],
        items: sale.items,
      }));

    return [...webSales, ...localCompletedSales].sort(
      (firstSale, secondSale) =>
        new Date(secondSale.createdAt).getTime() -
        new Date(firstSale.createdAt).getTime()
    );
  }, [localSales, orders]);

  const filteredSales = completedSales.filter((sale) =>
    isWithinRange(sale.createdAt, range)
  );
  const webSales = filteredSales.filter((sale) => sale.source === "web");
  const localCompletedSales = filteredSales.filter(
    (sale) => sale.source === "local"
  );
  const totalRevenue = filteredSales.reduce(
    (total, sale) => total + sale.total,
    0
  );
  const totalItems = filteredSales.reduce(
    (total, sale) =>
      total +
      sale.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
    0
  );
  const averageTicket =
    filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const pendingOrders = orders.filter(
    (order) => order.status === "pending_payment"
  ).length;

  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = formatDayKey(date);
    const daySales = completedSales.filter(
      (sale) => formatDayKey(new Date(sale.createdAt)) === key
    );
    const total = daySales.reduce((sum, sale) => sum + sale.total, 0);

    return {
      key,
      label: date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
      }),
      total,
      count: daySales.length,
    };
  });
  const maxDailyTotal = Math.max(
    1,
    ...dailySales.map((day) => day.total)
  );

  const productRanking = Array.from(
    filteredSales
      .flatMap((sale) => sale.items)
      .reduce((products, item) => {
        const key = `${item.productSku ?? ""}-${item.productName}`;
        const current = products.get(key) ?? {
          sku: item.productSku,
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity;
        current.revenue += item.subtotal;
        products.set(key, current);

        return products;
      }, new Map<string, { sku?: string | null; name: string; quantity: number; revenue: number }>())
      .values()
  )
    .sort((firstProduct, secondProduct) => {
      if (secondProduct.quantity !== firstProduct.quantity) {
        return secondProduct.quantity - firstProduct.quantity;
      }

      return secondProduct.revenue - firstProduct.revenue;
    })
    .slice(0, 8);

  const paymentSummary = Array.from(
    filteredSales
      .reduce((payments, sale) => {
        const current = payments.get(sale.payment) ?? {
          label: sale.payment,
          count: 0,
          revenue: 0,
        };

        current.count += 1;
        current.revenue += sale.total;
        payments.set(sale.payment, current);

        return payments;
      }, new Map<string, { label: string; count: number; revenue: number }>())
      .values()
  ).sort((firstPayment, secondPayment) => secondPayment.revenue - firstPayment.revenue);

  if (isAuthLoading || isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <p className="text-sm font-semibold text-zinc-400">
          Cargando estadisticas...
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
            Estadisticas
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entra con las mismas credenciales de Gestion para ver ventas,
            rankings y reportes.
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
            {isSendingLogin ? "Entrando..." : "Entrar a Gestion"}
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
                    item.active
                      ? "bg-white text-black"
                      : item.featured
                        ? "bg-emerald-400 text-black hover:bg-emerald-300"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
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
              Admin tienda
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

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden px-3 py-3">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Gestion
              </p>
              <h1 className="text-2xl font-black text-white">
                Estadisticas
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["7", "30", "all"] as StatsRange[]).map((nextRange) => (
                <button
                  key={nextRange}
                  type="button"
                  onClick={() => setRange(nextRange)}
                  className={`h-9 rounded-xl px-3 text-xs font-bold transition ${
                    range === nextRange
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {rangeLabels[nextRange]}
                </button>
              ))}

              <button
                type="button"
                onClick={() => void refreshStats()}
                disabled={isLoadingStats}
                className="h-9 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingStats ? "Cargando..." : "Actualizar"}
              </button>
            </div>
          </header>

          {statsError && (
            <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {statsError}
            </div>
          )}

          <div className="mb-3 flex shrink-0 gap-2 overflow-x-auto">
            {statsTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition ${
                  activeTab === tab.value
                    ? "bg-white text-black"
                    : "bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            {activeTab === "summary" && (
              <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div className="flex min-h-0 flex-col gap-3">
                  <section className="grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        Facturacion
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {formatPrice(totalRevenue)}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        Ventas
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {filteredSales.length}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        Ticket promedio
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {formatPrice(averageTicket)}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs font-semibold uppercase text-zinc-500">
                        Prendas
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {totalItems}
                      </p>
                    </article>
                  </section>

                  <article className="min-h-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                          Ultimos 7 dias
                        </p>
                        <h2 className="text-lg font-black text-white">
                          Evolucion de ventas
                        </h2>
                      </div>
                      <TrendingUp size={20} className="text-emerald-300" />
                    </div>

                    <div className="mt-5 grid h-[calc(100%-64px)] min-h-48 grid-cols-7 items-end gap-2">
                      {dailySales.map((day) => (
                        <div
                          key={day.key}
                          className="flex h-full flex-col justify-end"
                        >
                          <div className="flex min-h-0 flex-1 items-end">
                            <div
                              className="w-full rounded-t-xl bg-emerald-400/80"
                              style={{
                                height: `${Math.max(
                                  6,
                                  (day.total / maxDailyTotal) * 100
                                )}%`,
                              }}
                              title={`${day.label}: ${formatPrice(day.total)}`}
                            />
                          </div>
                          <p className="mt-2 text-center text-[11px] font-bold text-zinc-500">
                            {day.label}
                          </p>
                          <p className="text-center text-[11px] text-zinc-600">
                            {day.count}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>

                <div className="grid min-h-0 gap-3">
                  <article className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <p className="text-xs font-semibold uppercase text-yellow-200/70">
                      Web pendientes
                    </p>
                    <p className="mt-2 text-2xl font-black text-yellow-100">
                      {pendingOrders}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Canales
                    </p>
                    <div className="mt-4 grid gap-2">
                      <div className="rounded-2xl bg-zinc-950 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-white">Web</span>
                          <span className="text-sm font-black text-white">
                            {formatPrice(
                              webSales.reduce((sum, sale) => sum + sale.total, 0)
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">
                          {webSales.length} ventas confirmadas
                        </p>
                      </div>
                      <div className="rounded-2xl bg-zinc-950 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-white">Local</span>
                          <span className="text-sm font-black text-white">
                            {formatPrice(
                              localCompletedSales.reduce(
                                (sum, sale) => sum + sale.total,
                                0
                              )
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">
                          {localCompletedSales.length} ventas completadas
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <article className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Ranking
                </p>
                <h2 className="text-lg font-black text-white">
                  Productos mas vendidos
                </h2>

                <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800">
                  <div className="grid grid-cols-[70px_minmax(0,1fr)_80px_120px] gap-3 bg-zinc-950 px-3 py-2 text-xs font-bold uppercase text-zinc-500">
                    <span>SKU</span>
                    <span>Producto</span>
                    <span>Cant.</span>
                    <span className="text-right">Importe</span>
                  </div>
                  <div className="h-full overflow-y-auto divide-y divide-zinc-800">
                    {productRanking.length === 0 ? (
                      <p className="px-3 py-5 text-sm text-zinc-500">
                        Todavia no hay ventas confirmadas en este periodo.
                      </p>
                    ) : (
                      productRanking.map((product) => (
                        <div
                          key={`${product.sku}-${product.name}`}
                          className="grid grid-cols-[70px_minmax(0,1fr)_80px_120px] items-center gap-3 px-3 py-2 text-sm"
                        >
                          <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300">
                            {getShortSku(product.sku)}
                          </span>
                          <span className="truncate font-semibold text-white">
                            {product.name}
                          </span>
                          <span className="font-black text-zinc-200">
                            x{product.quantity}
                          </span>
                          <span className="text-right font-black text-white">
                            {formatPrice(product.revenue)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            )}

            {activeTab === "payments" && (
              <article className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Cobros
                </p>
                <h2 className="text-lg font-black text-white">
                  Metodos de pago
                </h2>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                  <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
                    {paymentSummary.length === 0 ? (
                      <p className="rounded-2xl bg-zinc-950 p-3 text-sm text-zinc-500">
                        Sin cobros para mostrar.
                      </p>
                    ) : (
                      paymentSummary.map((payment) => (
                        <div
                          key={payment.label}
                          className="rounded-2xl bg-zinc-950 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-white">
                              {payment.label}
                            </span>
                            <span className="font-black text-white">
                              {formatPrice(payment.revenue)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            {payment.count} operaciones
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            )}

            {activeTab === "planned" && (
              <section className="grid h-full min-h-0 gap-3 md:grid-cols-3">
                {[
                  ["Stock", "Faltantes, rotacion y alertas por talle/color."],
                  ["Clientes", "Frecuencia de compra y mejores clientes."],
                  ["Envios", "Pedidos por preparar, despachados y pendientes."],
                ].map(([title, detail]) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-4"
                  >
                    <p className="font-black text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {detail}
                    </p>
                  </article>
                ))}
              </section>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
