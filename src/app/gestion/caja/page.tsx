"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Images,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  closeCashSession,
  createCashMovement,
  deleteCashMovement,
  getCashMovements,
  getCashSessions,
  openCashSession,
} from "@/lib/cash";
import { getLocalSales } from "@/lib/localSales";
import { getAdminOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/pricing";
import {
  buildCompletedSales,
  getShortSaleNumber,
  isSaleWithinPeriod,
  type CompletedSalePayment,
  type SalesPeriod,
} from "@/lib/salesAnalytics";
import { supabase } from "@/lib/supabase";
import type {
  CashMovement,
  CashMovementType,
  CashPaymentMethod,
  CashSession,
} from "@/types/cash";
import type { LocalSale } from "@/types/localSale";
import type { AdminOrder } from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type CashModal = "open" | "movement" | "close" | null;
type PaymentFilter = "all" | CompletedSalePayment;
type OriginFilter = "all" | "sales" | "manual";

type LedgerRow = {
  id: string;
  date: string;
  reference: string;
  origin: "Web" | "Local" | "Manual";
  concept: string;
  payment: CompletedSalePayment;
  income: number;
  expense: number;
  movementId?: string;
};

const navItems = [
  { title: "Punto de venta", href: "/gestion/puntoventa", icon: ShoppingBag, featured: true },
  { title: "Ventas", href: "/gestion/ventas", icon: ClipboardList },
  { title: "Envios", href: "/gestion/envios", icon: Truck },
  { title: "Inventario", href: "/gestion/inventario", icon: Boxes },
  { title: "Caja", href: "/gestion/caja", icon: CreditCard, active: true },
  { title: "Estadisticas", href: "/gestion/estadisticas", icon: BarChart3 },
  { title: "Catalogo", href: "/gestion/catalogo", icon: Images },
];

const periods: Array<{ value: SalesPeriod; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "all", label: "Todo" },
];

const paymentOptions: Array<{ value: PaymentFilter; label: string }> = [
  { value: "all", label: "Todos los medios" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Mixto", label: "Mixto" },
];

const originOptions: Array<{ value: OriginFilter; label: string }> = [
  { value: "all", label: "Todos los movimientos" },
  { value: "sales", label: "Ventas" },
  { value: "manual", label: "Manuales" },
];

const paymentClassNames: Record<CompletedSalePayment, string> = {
  Efectivo: "bg-emerald-950 text-emerald-300 ring-emerald-800",
  Transferencia: "bg-blue-950 text-blue-300 ring-blue-800",
  Mixto: "bg-violet-950 text-violet-300 ring-violet-800",
};

function isCashSchemaMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string };
  return (
    value.code === "42P01" ||
    value.code === "PGRST205" ||
    value.message?.includes("cash_sessions") === true ||
    value.message?.includes("cash_movements") === true
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("es-AR"),
    time: date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function paymentFromMovement(method: CashPaymentMethod): CompletedSalePayment {
  return method === "cash" ? "Efectivo" : "Transferencia";
}

export default function GestionCajaPage() {
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
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashSchemaReady, setCashSchemaReady] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState<SalesPeriod>("today");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [activeModal, setActiveModal] = useState<CashModal>(null);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNote, setOpeningNote] = useState("");
  const [movementType, setMovementType] = useState<CashMovementType>("expense");
  const [movementMethod, setMovementMethod] = useState<CashPaymentMethod>("cash");
  const [movementDescription, setMovementDescription] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [movementToDelete, setMovementToDelete] = useState<CashMovement | null>(null);

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
      try {
        const [nextSessions, nextMovements] = await Promise.all([
          getCashSessions(),
          getCashMovements(),
        ]);
        setCashSessions(nextSessions);
        setCashMovements(nextMovements);
        setCashSchemaReady(true);
      } catch (error) {
        if (!isCashSchemaMissing(error)) throw error;
        setCashSchemaReady(false);
        setCashSessions([]);
        setCashMovements([]);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los movimientos de caja."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;
    queueMicrotask(() => void refreshData());
  }, [session, isAllowed]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const completedSales = useMemo(
    () => buildCompletedSales(orders, localSales),
    [orders, localSales]
  );
  const openSession = cashSessions.find((item) => !item.closedAt) ?? null;
  const sessionSales = useMemo(() => {
    if (!openSession) return [];
    const openedAt = new Date(openSession.openedAt).getTime();
    return completedSales.filter(
      (sale) => new Date(sale.createdAt).getTime() >= openedAt
    );
  }, [completedSales, openSession]);
  const sessionMovements = useMemo(
    () => cashMovements.filter((item) => item.sessionId === openSession?.id),
    [cashMovements, openSession]
  );
  const expectedCash = useMemo(() => {
    if (!openSession) return 0;
    const cashSales = sessionSales
      .filter((sale) => sale.payment === "Efectivo")
      .reduce((sum, sale) => sum + sale.total, 0);
    const manualCash = sessionMovements
      .filter((item) => item.paymentMethod === "cash")
      .reduce(
        (sum, item) =>
          sum + (item.type === "income" ? item.amount : -item.amount),
        0
      );
    return openSession.openingAmount + cashSales + manualCash;
  }, [openSession, sessionMovements, sessionSales]);

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    const saleRows: LedgerRow[] = completedSales.map((sale) => ({
      id: `sale-${sale.source}-${sale.id}`,
      date: sale.createdAt,
      reference: getShortSaleNumber(sale.number),
      origin: sale.source === "web" ? "Web" : "Local",
      concept: sale.source === "web" ? sale.customer : "Venta mostrador",
      payment: sale.payment,
      income: sale.total,
      expense: 0,
    }));
    const manualRows: LedgerRow[] = cashMovements.map((movement) => ({
      id: `manual-${movement.id}`,
      date: movement.createdAt,
      reference: "Manual",
      origin: "Manual",
      concept: movement.description,
      payment: paymentFromMovement(movement.paymentMethod),
      income: movement.type === "income" ? movement.amount : 0,
      expense: movement.type === "expense" ? movement.amount : 0,
      movementId: movement.id,
    }));
    return [...saleRows, ...manualRows].sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime()
    );
  }, [cashMovements, completedSales]);

  const visibleRows = useMemo(
    () =>
      ledgerRows.filter(
        (row) =>
          isSaleWithinPeriod(row.date, period) &&
          (paymentFilter === "all" || row.payment === paymentFilter) &&
          (originFilter === "all" ||
            (originFilter === "manual" && row.origin === "Manual") ||
            (originFilter === "sales" && row.origin !== "Manual"))
      ),
    [ledgerRows, originFilter, paymentFilter, period]
  );

  const totals = visibleRows.reduce(
    (summary, row) => {
      summary.income += row.income;
      summary.expense += row.expense;
      if (row.payment === "Efectivo") summary.cash += row.income - row.expense;
      if (row.payment === "Transferencia") {
        summary.transfer += row.income - row.expense;
      }
      return summary;
    },
    { income: 0, expense: 0, cash: 0, transfer: 0 }
  );

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

  const saveOpening = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(openingAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setIsSaving(true);
    setLoadError("");
    try {
      await openCashSession({ openingAmount: amount, note: openingNote });
      setActiveModal(null);
      setOpeningAmount("");
      setOpeningNote("");
      setNotice("Caja abierta correctamente.");
      await refreshData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo abrir la caja.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!openSession) return;
    const amount = Number(movementAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !movementDescription.trim()) return;
    setIsSaving(true);
    setLoadError("");
    try {
      await createCashMovement({
        sessionId: openSession.id,
        type: movementType,
        paymentMethod: movementMethod,
        description: movementDescription,
        amount,
        note: movementNote,
      });
      setActiveModal(null);
      setMovementDescription("");
      setMovementAmount("");
      setMovementNote("");
      setNotice(movementType === "income" ? "Ingreso registrado." : "Egreso registrado.");
      await refreshData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo registrar el movimiento.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveClosing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!openSession) return;
    const amount = Number(closingAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setIsSaving(true);
    setLoadError("");
    try {
      await closeCashSession({
        sessionId: openSession.id,
        closingAmount: amount,
        expectedAmount: expectedCash,
        note: closingNote,
      });
      setActiveModal(null);
      setClosingAmount("");
      setClosingNote("");
      setNotice("Caja cerrada y diferencia guardada.");
      await refreshData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cerrar la caja.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteMovement = async () => {
    if (!movementToDelete) return;
    setIsSaving(true);
    setLoadError("");
    try {
      await deleteCashMovement(movementToDelete.id);
      setMovementToDelete(null);
      setNotice("Movimiento eliminado.");
      await refreshData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo eliminar el movimiento.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isCheckingAccess) {
    return <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white"><p className="text-sm text-zinc-400">Cargando caja...</p></main>;
  }

  if (!session || !isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">AIVLIS</p>
          <h1 className="mt-3 text-4xl font-bold">Caja</h1>
          <input type="email" placeholder="tu@email.com" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required className="mt-8 h-12 w-full rounded-xl bg-zinc-900 px-4 outline-none ring-1 ring-zinc-800 focus:ring-white" />
          <input type="password" placeholder="Contrasena" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required className="mt-4 h-12 w-full rounded-xl bg-zinc-900 px-4 outline-none ring-1 ring-zinc-800 focus:ring-white" />
          <button type="submit" disabled={isSendingLogin} className="mt-4 h-12 w-full cursor-pointer rounded-xl bg-white font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">{isSendingLogin ? "Entrando..." : "Entrar a Gestion"}</button>
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
            <Link href="/" className="block text-xl font-bold tracking-[0.35em] transition hover:opacity-70">AIVLIS</Link>
            <button type="button" onClick={handleLogout} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 lg:hidden"><LogOut size={16} />Salir</button>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return <Link key={item.title} href={item.href} className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition lg:w-full ${item.active ? "bg-white text-black" : item.featured ? "bg-emerald-400 text-black hover:bg-emerald-300" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}><Icon size={18} />{item.title}</Link>;
            })}
          </nav>
          <div className="mt-6 hidden gap-2 lg:grid">
            <Link href="/admin" className="flex h-11 items-center gap-3 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"><Settings size={18} />Admin catalogo</Link>
            <button type="button" onClick={handleLogout} className="flex h-11 cursor-pointer items-center gap-3 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"><LogOut size={18} />Salir</button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden p-2">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-2 pb-2">
            <div className="flex items-center gap-3">
              <div><h1 className="text-xl font-black">Caja</h1><p className="text-xs text-zinc-500">Entradas, salidas y control de efectivo</p></div>
              {cashSchemaReady && <span className={`rounded px-2 py-1 text-xs font-bold ${openSession ? "bg-emerald-950 text-emerald-300" : "bg-zinc-900 text-zinc-400"}`}>{openSession ? `Abierta ${formatDateTime(openSession.openedAt).time}` : "Cerrada"}</span>}
            </div>
            <div className="flex items-center gap-2">
              {cashSchemaReady && !openSession && <button type="button" onClick={() => setActiveModal("open")} className="h-9 cursor-pointer bg-emerald-400 px-4 text-sm font-black text-black hover:bg-emerald-300">Abrir caja</button>}
              {cashSchemaReady && openSession && <><button type="button" onClick={() => setActiveModal("movement")} className="inline-flex h-9 cursor-pointer items-center gap-2 bg-white px-4 text-sm font-black text-black hover:bg-zinc-200"><Plus size={16} />Movimiento</button><button type="button" onClick={() => { setClosingAmount(`${expectedCash}`); setActiveModal("close"); }} className="h-9 cursor-pointer border border-zinc-700 px-4 text-sm font-bold hover:bg-zinc-900">Cerrar caja</button></>}
              <button type="button" onClick={() => void refreshData()} disabled={isLoading} title="Actualizar" className="flex h-9 w-9 cursor-pointer items-center justify-center border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /></button>
            </div>
          </header>

          {!cashSchemaReady && <div className="flex shrink-0 items-center justify-between gap-4 border border-amber-700 bg-amber-950/45 px-4 py-3 text-sm text-amber-100"><span>Para habilitar apertura, movimientos y cierre, ejecuta <strong>supabase/cash-register.sql</strong>.</span><span className="shrink-0 font-bold">Las ventas siguen visibles.</span></div>}
          {loadError && <p className="shrink-0 border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">{loadError}</p>}
          {notice && <p className="fixed left-1/2 top-4 z-[80] -translate-x-1/2 bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xl">{notice}</p>}

          {openSession && <section className="grid shrink-0 grid-cols-3 divide-x divide-zinc-800 border border-zinc-800 bg-zinc-950"><div className="px-4 py-3"><p className="text-[10px] font-bold uppercase text-zinc-500">Efectivo inicial</p><strong className="mt-1 block text-lg">{formatPrice(openSession.openingAmount)}</strong></div><div className="px-4 py-3"><p className="text-[10px] font-bold uppercase text-zinc-500">Efectivo esperado ahora</p><strong className="mt-1 block text-lg text-emerald-300">{formatPrice(expectedCash)}</strong></div><div className="px-4 py-3"><p className="text-[10px] font-bold uppercase text-zinc-500">Movimientos manuales</p><strong className="mt-1 block text-lg">{sessionMovements.length}</strong></div></section>}

          <section className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-zinc-800 px-1 pb-2">
            <div className="grid grid-cols-5 divide-x divide-zinc-800">{[["Entradas", formatPrice(totals.income)], ["Salidas", formatPrice(totals.expense)], ["Neto", formatPrice(totals.income - totals.expense)], ["Efectivo", formatPrice(totals.cash)], ["Transferencia", formatPrice(totals.transfer)]].map(([label, value]) => <div key={label} className="min-w-[125px] px-3 first:pl-1"><p className="text-[10px] font-bold uppercase text-zinc-500">{label}</p><strong className="mt-1 block text-base">{value}</strong></div>)}</div>
            <div className="flex items-center gap-2"><select value={period} onChange={(event) => setPeriod(event.target.value as SalesPeriod)} className="h-9 cursor-pointer border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold outline-none">{periods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={originFilter} onChange={(event) => setOriginFilter(event.target.value as OriginFilter)} className="h-9 cursor-pointer border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold outline-none">{originOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)} className="h-9 cursor-pointer border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold outline-none">{paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          </section>

          <section className="min-h-0 min-w-0 flex-1 overflow-auto border border-zinc-800 bg-zinc-950 [scrollbar-gutter:stable]">
            <div className="min-w-[920px]">
              <div className="sticky top-0 z-10 grid grid-cols-[120px_105px_90px_minmax(200px,1fr)_135px_125px_125px_52px] border-b border-zinc-700 bg-zinc-900 text-[10px] font-bold uppercase text-zinc-400">{["Fecha", "Referencia", "Origen", "Concepto", "Medio", "Entrada", "Salida", ""].map((label, index) => <span key={`${label}-${index}`} className="border-r border-zinc-700 px-3 py-3 last:border-r-0">{label}</span>)}</div>
              {visibleRows.length === 0 ? <p className="p-8 text-center text-sm text-zinc-500">No hay movimientos para estos filtros.</p> : visibleRows.map((row) => {
                const date = formatDateTime(row.date);
                const movement = row.movementId ? cashMovements.find((item) => item.id === row.movementId) : null;
                return <div key={row.id} className="grid grid-cols-[120px_105px_90px_minmax(200px,1fr)_135px_125px_125px_52px] items-center border-b border-zinc-800 text-sm hover:bg-zinc-900/70"><span className="border-r border-zinc-800 px-3 py-2"><strong className="block text-xs">{date.date}</strong><small className="text-zinc-500">{date.time}</small></span><strong className="border-r border-zinc-800 px-3 py-3">{row.reference}</strong><span className="border-r border-zinc-800 px-3 py-3 font-bold">{row.origin}</span><span className="truncate border-r border-zinc-800 px-3 py-3 font-semibold" title={row.concept}>{row.concept}</span><span className="border-r border-zinc-800 px-3 py-3"><span className={`inline-flex rounded px-2 py-1 text-xs font-bold ring-1 ring-inset ${paymentClassNames[row.payment]}`}>{row.payment}</span></span><strong className="border-r border-zinc-800 px-3 py-3 text-emerald-300">{row.income ? formatPrice(row.income) : "-"}</strong><strong className="border-r border-zinc-800 px-3 py-3 text-red-300">{row.expense ? formatPrice(row.expense) : "-"}</strong><span className="flex justify-center">{movement && openSession?.id === movement.sessionId && <button type="button" onClick={() => setMovementToDelete(movement)} title="Eliminar movimiento" className="flex h-8 w-8 cursor-pointer items-center justify-center text-red-300 hover:bg-red-950"><Trash2 size={15} /></button>}</span></div>;
              })}
            </div>
          </section>
        </section>
      </div>

      {activeModal && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setActiveModal(null); }}><section className="w-full max-w-lg border border-zinc-700 bg-zinc-950 shadow-2xl"><header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div><p className="text-[10px] font-bold uppercase text-zinc-500">Caja</p><h2 className="text-xl font-black">{activeModal === "open" ? "Abrir caja" : activeModal === "movement" ? "Nuevo movimiento" : "Cerrar caja"}</h2></div><button type="button" onClick={() => setActiveModal(null)} disabled={isSaving} className="flex h-9 w-9 cursor-pointer items-center justify-center bg-zinc-900 hover:bg-zinc-800 disabled:cursor-not-allowed"><X size={18} /></button></header>
        {activeModal === "open" && <form onSubmit={saveOpening} className="grid gap-4 p-5"><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Efectivo inicial<input autoFocus type="number" min="0" step="0.01" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} onFocus={(event) => event.currentTarget.select()} onWheel={(event) => event.currentTarget.blur()} required className="h-12 bg-zinc-900 px-4 text-lg font-black text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Nota opcional<textarea value={openingNote} onChange={(event) => setOpeningNote(event.target.value)} rows={3} className="resize-none bg-zinc-900 p-3 text-sm font-normal text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><button type="submit" disabled={isSaving} className="h-12 cursor-pointer bg-emerald-400 font-black text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Abriendo..." : "Confirmar apertura"}</button></form>}
        {activeModal === "movement" && <form onSubmit={saveMovement} className="grid gap-4 p-5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMovementType("income")} className={`flex h-11 cursor-pointer items-center justify-center gap-2 font-black ${movementType === "income" ? "bg-emerald-400 text-black" : "bg-zinc-900 text-zinc-300"}`}><ArrowDownLeft size={17} />Ingreso</button><button type="button" onClick={() => setMovementType("expense")} className={`flex h-11 cursor-pointer items-center justify-center gap-2 font-black ${movementType === "expense" ? "bg-red-500 text-white" : "bg-zinc-900 text-zinc-300"}`}><ArrowUpRight size={17} />Egreso</button></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMovementMethod("cash")} className={`h-10 cursor-pointer font-bold ${movementMethod === "cash" ? "bg-white text-black" : "bg-zinc-900 text-zinc-300"}`}>Efectivo</button><button type="button" onClick={() => setMovementMethod("transfer")} className={`h-10 cursor-pointer font-bold ${movementMethod === "transfer" ? "bg-white text-black" : "bg-zinc-900 text-zinc-300"}`}>Transferencia</button></div><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Concepto<input autoFocus value={movementDescription} onChange={(event) => setMovementDescription(event.target.value)} placeholder={movementType === "income" ? "Ej. aporte de caja" : "Ej. compra de bolsas"} required className="h-11 bg-zinc-900 px-3 text-sm normal-case text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Importe<input type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} onFocus={(event) => event.currentTarget.select()} onWheel={(event) => event.currentTarget.blur()} required className="h-12 bg-zinc-900 px-4 text-lg font-black text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Detalle opcional<input value={movementNote} onChange={(event) => setMovementNote(event.target.value)} className="h-11 bg-zinc-900 px-3 text-sm normal-case text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><button type="submit" disabled={isSaving} className={`h-12 cursor-pointer font-black disabled:cursor-not-allowed disabled:opacity-60 ${movementType === "income" ? "bg-emerald-400 text-black" : "bg-red-500 text-white"}`}>{isSaving ? "Guardando..." : movementType === "income" ? "Registrar ingreso" : "Registrar egreso"}</button></form>}
        {activeModal === "close" && <form onSubmit={saveClosing} className="grid gap-4 p-5"><div className="grid grid-cols-2 divide-x divide-zinc-800 border border-zinc-800"><div className="p-3"><p className="text-[10px] font-bold uppercase text-zinc-500">Esperado</p><strong className="mt-1 block text-xl text-emerald-300">{formatPrice(expectedCash)}</strong></div><div className="p-3"><p className="text-[10px] font-bold uppercase text-zinc-500">Diferencia</p><strong className={`mt-1 block text-xl ${Number(closingAmount || 0) - expectedCash < 0 ? "text-red-300" : "text-white"}`}>{formatPrice(Number(closingAmount || 0) - expectedCash)}</strong></div></div><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Efectivo contado<input autoFocus type="number" min="0" step="0.01" value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} onFocus={(event) => event.currentTarget.select()} onWheel={(event) => event.currentTarget.blur()} required className="h-12 bg-zinc-900 px-4 text-lg font-black text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><label className="grid gap-2 text-xs font-bold uppercase text-zinc-400">Nota opcional<textarea value={closingNote} onChange={(event) => setClosingNote(event.target.value)} rows={3} className="resize-none bg-zinc-900 p-3 text-sm font-normal text-white outline-none ring-1 ring-zinc-700 focus:ring-white" /></label><button type="submit" disabled={isSaving} className="h-12 cursor-pointer bg-white font-black text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Cerrando..." : "Confirmar cierre"}</button></form>}
      </section></div>}

      {movementToDelete && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"><section className="w-full max-w-sm border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"><h2 className="text-lg font-black">Eliminar movimiento</h2><p className="mt-2 text-sm text-zinc-400">Se quitara <strong className="text-white">{movementToDelete.description}</strong> por {formatPrice(movementToDelete.amount)}.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMovementToDelete(null)} disabled={isSaving} className="h-11 cursor-pointer bg-zinc-900 font-bold disabled:cursor-not-allowed">Cancelar</button><button type="button" onClick={() => void confirmDeleteMovement()} disabled={isSaving} className="h-11 cursor-pointer bg-red-600 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Eliminando..." : "Eliminar"}</button></div></section></div>}
    </main>
  );
}
