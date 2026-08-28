"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Images,
  LogOut,
  RefreshCw,
  Settings,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getLocalSales } from "@/lib/localSales";
import { getAdminOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";
import {
  buildCompletedSales,
  isSaleWithinPeriod,
  type SalesPeriod,
} from "@/lib/salesAnalytics";
import { supabase } from "@/lib/supabase";
import type { LocalSale } from "@/types/localSale";
import type { AdminOrder } from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type StatsTab = "summary" | "products" | "payments";

const navItems = [
  { title: "Punto de venta", href: "/gestion/puntoventa", icon: ShoppingBag, featured: true },
  { title: "Ventas", href: "/gestion/ventas", icon: ClipboardList },
  { title: "Envios", href: "/gestion/envios", icon: Truck },
  { title: "Inventario", href: "/gestion/inventario", icon: Boxes },
  { title: "Caja", href: "/gestion/caja", icon: CreditCard },
  { title: "Estadisticas", href: "/gestion/estadisticas", icon: BarChart3, active: true },
  { title: "Catalogo", href: "/gestion/catalogo", icon: Images },
];

const tabs: Array<{ value: StatsTab; label: string }> = [
  { value: "summary", label: "Resumen" },
  { value: "products", label: "Productos" },
  { value: "payments", label: "Cobros" },
];

const periods: Array<{ value: SalesPeriod; label: string }> = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "all", label: "Todo" },
];

function getShortSku(value?: string | null) {
  return value?.startsWith("AIV-") ? value.slice(4) : value || "-";
}

function getDayKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [period, setPeriod] = useState<SalesPeriod>("30");
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

  const refreshData = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [nextOrders, nextLocalSales] = await Promise.all([
        getAdminOrders(),
        getLocalSales(),
      ]);
      setOrders(nextOrders);
      setLocalSales(nextLocalSales);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las estadisticas."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;
    queueMicrotask(() => void refreshData());
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
  };

  const completedSales = useMemo(
    () => buildCompletedSales(orders, localSales),
    [orders, localSales]
  );
  const filteredSales = useMemo(
    () =>
      completedSales.filter((sale) =>
        isSaleWithinPeriod(sale.createdAt, period)
      ),
    [completedSales, period]
  );
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCost = filteredSales.reduce((sum, sale) => sum + sale.cost, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
  const totalUnits = filteredSales.reduce((sum, sale) => sum + sale.units, 0);
  const averageTicket = filteredSales.length
    ? totalRevenue / filteredSales.length
    : 0;
  const grossMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = getDayKey(date);
    const sales = completedSales.filter(
      (sale) => getDayKey(new Date(sale.createdAt)) === key
    );
    return {
      key,
      label: date.toLocaleDateString("es-AR", { weekday: "short" }).slice(0, 3),
      total: sales.reduce((sum, sale) => sum + sale.total, 0),
    };
  });
  const maxDailyRevenue = Math.max(1, ...dailySales.map((day) => day.total));

  const productRanking = Array.from(
    filteredSales
      .flatMap((sale) => sale.items)
      .reduce((products, item) => {
        const key = `${item.productSku || ""}-${item.productName}`;
        const current = products.get(key) ?? {
          sku: item.productSku,
          name: item.productName,
          units: 0,
          revenue: 0,
          cost: 0,
        };
        current.units += item.quantity;
        current.revenue += item.subtotal;
        current.cost += item.unitCost * item.quantity;
        products.set(key, current);
        return products;
      }, new Map<string, { sku?: string | null; name: string; units: number; revenue: number; cost: number }>())
      .values()
  ).sort(
    (first, second) =>
      second.units - first.units || second.revenue - first.revenue
  );

  const paymentSummary = Array.from(
    filteredSales
      .reduce((payments, sale) => {
        const current = payments.get(sale.payment) ?? {
          label: sale.payment,
          operations: 0,
          revenue: 0,
        };
        current.operations += 1;
        current.revenue += sale.total;
        payments.set(sale.payment, current);
        return payments;
      }, new Map<string, { label: string; operations: number; revenue: number }>())
      .values()
  ).sort((first, second) => second.revenue - first.revenue);

  const channelSummary = (["web", "local"] as const).map((source) => {
    const sales = filteredSales.filter((sale) => sale.source === source);
    return {
      source,
      label: source === "web" ? "Web" : "Local",
      operations: sales.length,
      revenue: sales.reduce((sum, sale) => sum + sale.total, 0),
    };
  });

  if (isAuthLoading || isCheckingAccess) {
    return <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white"><p className="text-sm text-zinc-500">Cargando estadisticas...</p></main>;
  }

  if (!session || !isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <form onSubmit={handleLogin} className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">AIVLIS</p>
          <h1 className="mt-3 text-4xl font-bold">Estadisticas</h1>
          <input type="email" placeholder="tu@email.com" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required className="mt-8 h-12 w-full border border-zinc-700 bg-zinc-900 px-4 text-white outline-none focus:border-white" />
          <input type="password" placeholder="Contrasena" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required className="mt-4 h-12 w-full border border-zinc-700 bg-zinc-900 px-4 text-white outline-none focus:border-white" />
          <button type="submit" disabled={isSendingLogin} className="mt-4 h-12 w-full cursor-pointer bg-white font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">{isSendingLogin ? "Entrando..." : "Entrar a Gestion"}</button>
          {authMessage && <p className="mt-4 text-sm text-zinc-500">{authMessage}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#090909] text-white">
      <div className="grid h-full min-h-0 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-800 bg-zinc-950 px-2 py-3 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link href="/" className="block text-xl font-bold tracking-[0.35em] text-white transition hover:opacity-70">AIVLIS</Link>
            <button type="button" onClick={handleLogout} className="inline-flex h-10 cursor-pointer items-center gap-2 bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 lg:hidden"><LogOut size={16} />Salir</button>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return <Link key={item.title} href={item.href} className={`flex h-11 shrink-0 items-center gap-3 px-3 text-sm font-semibold transition lg:w-full ${item.active ? "bg-white text-black" : item.featured ? "bg-emerald-400 text-black hover:bg-emerald-300" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}><Icon size={18} />{item.title}</Link>;
            })}
          </nav>
          <div className="mt-6 hidden gap-2 lg:grid">
            <Link href="/admin" className="flex h-11 items-center gap-3 bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"><Settings size={18} />Admin catalogo</Link>
            <button type="button" onClick={handleLogout} className="flex h-11 cursor-pointer items-center gap-3 bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"><LogOut size={18} />Salir</button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden p-3">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
            <div>
              <h1 className="text-xl font-black">Estadisticas</h1>
              <p className="text-xs text-zinc-500">Lectura de ventas confirmadas</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-zinc-700 bg-zinc-900 p-1">
                {tabs.map((tab) => <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} className={`h-8 cursor-pointer px-3 text-xs font-black transition ${activeTab === tab.value ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>{tab.label}</button>)}
              </div>
              <select value={period} onChange={(event) => setPeriod(event.target.value as SalesPeriod)} className="h-10 cursor-pointer border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-white outline-none focus:border-white">{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <button type="button" onClick={() => void refreshData()} disabled={isLoading} title="Actualizar" className="flex h-10 w-10 cursor-pointer items-center justify-center bg-white text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
          </header>

          {loadError && <p className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">{loadError}</p>}

          <section className="min-h-0 flex-1 overflow-hidden bg-[#080808]">
            {activeTab === "summary" && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="grid shrink-0 grid-cols-2 border-b border-zinc-800 md:grid-cols-5">
                  {[
                    ["Facturacion", formatPrice(totalRevenue)],
                    ["Resultado bruto", formatPrice(totalProfit)],
                    ["Ventas", `${filteredSales.length}`],
                    ["Ticket promedio", formatPrice(averageTicket)],
                    ["Prendas", `${totalUnits}`],
                  ].map(([label, value], index) => <div key={label} className="border-r border-zinc-800 px-4 py-4 last:border-r-0"><p className="text-[10px] font-bold uppercase text-zinc-500">{label}</p><p className={`mt-1 text-xl font-black ${index === 1 ? "text-emerald-300" : "text-white"}`}>{value}</p></div>)}
                </div>

                <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1.45fr)_340px]">
                  <section className="flex min-h-[300px] flex-col border-b border-zinc-800 p-5 xl:border-b-0 xl:border-r">
                    <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase text-zinc-500">Actividad reciente</p><h2 className="text-base font-black">Ventas de los ultimos 7 dias</h2></div><TrendingUp size={19} className="text-emerald-600" /></div>
                    <div className="mt-4 grid min-h-[210px] flex-1 grid-cols-7 items-end gap-3">
                      {dailySales.map((day) => <div key={day.key} className="flex h-full min-w-0 flex-col justify-end"><p className="mb-1 truncate text-center text-[10px] font-bold text-zinc-500" title={formatPrice(day.total)}>{day.total > 0 ? formatPrice(day.total) : "-"}</p><div className="flex min-h-0 flex-1 items-end border-b border-zinc-700 bg-[linear-gradient(to_top,#3f3f46_1px,transparent_1px)] bg-[size:100%_25%]"><div className="w-full bg-emerald-500" style={{ height: `${day.total > 0 ? Math.max(8, (day.total / maxDailyRevenue) * 100) : 2}%` }} /></div><p className="mt-2 text-center text-[11px] font-bold uppercase text-zinc-500">{day.label}</p></div>)}
                    </div>
                  </section>

                  <aside className="divide-y divide-zinc-800 overflow-y-auto">
                    <section className="p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-zinc-500">Rentabilidad</p><h2 className="text-base font-black">Resumen del periodo</h2></div><strong className="text-xl text-emerald-300">{grossMargin.toFixed(1)}%</strong></div><dl className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800 text-sm"><div className="flex justify-between py-3"><dt className="text-zinc-500">Facturacion</dt><dd className="font-bold">{formatPrice(totalRevenue)}</dd></div><div className="flex justify-between py-3"><dt className="text-zinc-500">Costo vendido</dt><dd className="font-bold">{formatPrice(totalCost)}</dd></div><div className="flex justify-between py-3"><dt className="text-zinc-500">Resultado bruto</dt><dd className="font-black text-emerald-300">{formatPrice(totalProfit)}</dd></div></dl></section>
                    <section className="p-5"><p className="text-[10px] font-bold uppercase text-zinc-500">Origen de las ventas</p><div className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">{channelSummary.map((channel) => <div key={channel.source} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm"><span><strong>{channel.label}</strong><small className="ml-2 text-zinc-500">{channel.operations} ventas</small></span><strong>{formatPrice(channel.revenue)}</strong></div>)}</div></section>
                  </aside>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="grid shrink-0 grid-cols-[90px_minmax(180px,1fr)_90px_130px_130px_130px] border-b border-zinc-700 bg-zinc-900 text-[11px] font-bold uppercase text-zinc-400">{["SKU", "Producto", "Prendas", "Venta", "Costo", "Resultado"].map((label) => <span key={label} className="border-r border-zinc-800 px-3 py-3 last:border-r-0">{label}</span>)}</div>
                <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">{productRanking.length === 0 ? <p className="p-8 text-center text-sm text-zinc-500">Sin ventas para este periodo.</p> : productRanking.map((product, index) => <div key={`${product.sku}-${product.name}`} className="grid grid-cols-[90px_minmax(180px,1fr)_90px_130px_130px_130px] border-b border-zinc-800 text-sm hover:bg-zinc-900/50"><span className="border-r border-zinc-800 px-3 py-3 font-bold text-zinc-400">{getShortSku(product.sku)}</span><span className="truncate border-r border-zinc-800 px-3 py-3 font-bold"><span className="mr-2 text-xs text-zinc-500">{index + 1}</span>{product.name}</span><span className="border-r border-zinc-800 px-3 py-3 font-black">{product.units}</span><span className="border-r border-zinc-800 px-3 py-3 font-bold">{formatPrice(product.revenue)}</span><span className="border-r border-zinc-800 px-3 py-3 text-zinc-400">{formatPrice(product.cost)}</span><span className="px-3 py-3 font-black text-emerald-300">{formatPrice(product.revenue - product.cost)}</span></div>)}</div>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="grid grid-cols-[minmax(180px,1fr)_140px_170px_minmax(180px,1fr)] border-b border-zinc-700 bg-zinc-900 text-[11px] font-bold uppercase text-zinc-400">{["Medio de pago", "Operaciones", "Importe", "Participacion"].map((label) => <span key={label} className="border-r border-zinc-800 px-3 py-3 last:border-r-0">{label}</span>)}</div>
                <div className="min-h-0 flex-1 overflow-y-auto">{paymentSummary.length === 0 ? <p className="p-8 text-center text-sm text-zinc-500">Sin cobros para este periodo.</p> : paymentSummary.map((payment) => {
                  const share = totalRevenue > 0 ? (payment.revenue / totalRevenue) * 100 : 0;
                  return <div key={payment.label} className="grid grid-cols-[minmax(180px,1fr)_140px_170px_minmax(180px,1fr)] items-center border-b border-zinc-800 text-sm hover:bg-zinc-900/50"><strong className="border-r border-zinc-800 px-3 py-4">{payment.label}</strong><span className="border-r border-zinc-800 px-3 py-4">{payment.operations}</span><strong className="border-r border-zinc-800 px-3 py-4">{formatPrice(payment.revenue)}</strong><div className="px-3 py-4"><div className="h-2 overflow-hidden bg-zinc-800"><div className="h-full bg-emerald-500" style={{ width: `${share}%` }} /></div><p className="mt-1 text-xs font-bold text-zinc-500">{share.toFixed(1)}%</p></div></div>;
                })}</div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
