"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  Images,
  LogOut,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Settings,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminOrdersSection from "@/app/admin/AdminOrdersSection";
import {
  deleteOrder,
  getAdminOrders,
  updateOrderInternalNotes,
  updateOrderStatus,
} from "@/lib/orders";
import { formatOrderNumber } from "@/lib/orderNumber";
import type { AdminOrder, OrderStatus } from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type GestionSection =
  | "sales"
  | "shipping"
  | "cash"
  | "stats";
type SalesTab = "pending" | "web" | "local" | "cancelled";

type GestionNotice = {
  type: "success" | "error";
  message: string;
};

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const salesTabs: Array<{
  id: SalesTab;
  label: string;
  statusFilter?: OrderStatus;
}> = [
  { id: "pending", label: "Pendientes", statusFilter: "pending_payment" },
  { id: "web", label: "Ventas web", statusFilter: "confirmed" },
  { id: "local", label: "Ventas local" },
  { id: "cancelled", label: "Anuladas", statusFilter: "cancelled" },
];

const modules = [
  {
    title: "Punto de venta",
    description: "Pantalla separada para vender rapido sin cargar reportes.",
    status: "Separado",
    icon: ShoppingBag,
    featured: true,
  },
  {
    title: "Ventas",
    description: "Pedidos web, historial local, anuladas y pendientes.",
    status: "Activo",
    icon: ClipboardList,
    section: "sales" as const,
  },
  {
    title: "Envios",
    description: "Preparacion, despacho y control de entregas pendientes.",
    status: "Preparado",
    icon: Truck,
    section: "shipping" as const,
  },
  {
    title: "Inventario",
    description: "Stock operativo, faltantes y movimientos por producto.",
    status: "Activo",
    icon: Boxes,
    href: "/gestion/inventario",
  },
  {
    title: "Caja",
    description: "Efectivo, transferencia, Mercado Pago y cierre diario.",
    status: "Preparado",
    icon: CreditCard,
    section: "cash" as const,
  },
  {
    title: "Estadisticas",
    description: "Ventas, rankings, ticket promedio y comparativas.",
    status: "Activo",
    icon: BarChart3,
    href: "/gestion/estadisticas",
  },
  {
    title: "Catalogo",
    description: "Vista mobile para fotos, precios y existencias.",
    status: "Activo",
    icon: Images,
    href: "/gestion/catalogo",
  },
];

const workQueues = [
  {
    title: "Ventas",
    detail: "Pedidos web, historial local, anuladas y pendientes.",
    metric: "-",
    label: "por revisar",
    icon: ReceiptText,
    section: "sales" as const,
  },
  {
    title: "Envios",
    detail: "Pedidos listos para preparar o entregar a transporte.",
    metric: "-",
    label: "por preparar",
    icon: PackageCheck,
    section: "shipping" as const,
  },
  {
    title: "Caja",
    detail: "Cierre diario y metodos de cobro.",
    metric: "-",
    label: "hoy",
    icon: CreditCard,
    section: "cash" as const,
  },
];

const inventoryAlerts = [
  {
    title: "Bajo stock",
    detail: "Productos con pocas unidades por talle/color.",
    icon: AlertTriangle,
  },
  {
    title: "Sin stock",
    detail: "Publicados que ya no se pueden vender.",
    icon: PackageOpen,
  },
  {
    title: "Movimientos",
    detail: "Reservas, devoluciones y ventas del dia.",
    icon: Boxes,
  },
];

export default function GestionPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [activeSection, setActiveSection] =
    useState<GestionSection>("shipping");
  const [activeSalesTab, setActiveSalesTab] =
    useState<SalesTab>("pending");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [gestionNotice, setGestionNotice] =
    useState<GestionNotice | null>(null);

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
    setOrderError("");

    try {
      const orders = await getAdminOrders();

      setOrders(orders);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los pedidos"
      );
    } finally {
      setIsOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed || activeSection !== "sales") return;

    queueMicrotask(() => {
      void refreshOrders();
    });
  }, [session, isAllowed, activeSection]);

  useEffect(() => {
    if (!gestionNotice) return;

    const timeout = window.setTimeout(() => {
      setGestionNotice(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [gestionNotice]);

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

  const handleOrderStatusChange = async (
    order: AdminOrder,
    status: OrderStatus
  ) => {
    const previousStatus = order.status;

    try {
      await updateOrderStatus(order, status);
      await refreshOrders();
      setGestionNotice({
        type: "success",
        message: `Pedido ${formatOrderNumber(order.orderNumber)}: ${orderStatusLabels[previousStatus]} -> ${orderStatusLabels[status]}.`,
      });
    } catch (error) {
      setGestionNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el pedido.",
      });
    }
  };

  const handleDeleteOrder = async (order: AdminOrder) => {
    try {
      await deleteOrder(order);
      await refreshOrders();
      setGestionNotice({
        type: "success",
        message: `Pedido ${formatOrderNumber(order.orderNumber)} eliminado.`,
      });
    } catch (error) {
      setGestionNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el pedido.",
      });
    }
  };

  const handleDeleteOrders = async (selectedOrders: AdminOrder[]) => {
    try {
      for (const order of selectedOrders) {
        await deleteOrder(order);
      }

      await refreshOrders();
      setGestionNotice({
        type: "success",
        message: `${selectedOrders.length} pedidos eliminados.`,
      });
    } catch (error) {
      setGestionNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron eliminar los pedidos.",
      });
    }
  };

  const handleUpdateOrderInternalNotes = async (
    orderId: string,
    internalNotes: string
  ) => {
    try {
      await updateOrderInternalNotes(orderId, internalNotes);
      await refreshOrders();
      setGestionNotice({
        type: "success",
        message: "Nota interna guardada.",
      });
    } catch (error) {
      setGestionNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la nota interna.",
      });
    }
  };

  if (isAuthLoading || isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <p className="text-sm font-semibold text-zinc-400">
          Cargando Gestion...
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
            Gestion
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entra con las mismas credenciales del admin para operar ventas,
            pedidos, envios e inventario.
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
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive =
                "section" in module && activeSection === module.section;

              if (module.featured) {
                return (
                  <Link
                    key={module.title}
                    href="/gestion/puntoventa"
                    className="flex h-11 shrink-0 items-center gap-3 rounded-xl bg-emerald-400 px-3 text-left text-sm font-semibold text-black transition hover:bg-emerald-300 lg:w-full"
                  >
                    <Icon size={18} />
                    {module.title}
                  </Link>
                );
              }

              if ("section" in module && module.section === "sales") {
                return (
                  <Link
                    key={module.title}
                    href="/gestion/ventas"
                    className="flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white lg:w-full"
                  >
                    <Icon size={18} />
                    {module.title}
                  </Link>
                );
              }

              if ("href" in module && typeof module.href === "string") {
                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white lg:w-full"
                  >
                    <Icon size={18} />
                    {module.title}
                  </Link>
                );
              }

              return (
                <button
                  key={module.title}
                  type="button"
                  onClick={() => {
                    if ("section" in module && module.section) {
                      setActiveSection(module.section);
                    }
                  }}
                  className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition lg:w-full ${
                    isActive
                      ? "bg-white text-black"
                      : "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {module.title}
                </button>
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

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden px-2 py-2">
          <header className="mb-2 shrink-0 flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-bold uppercase text-black">
                  Operativo
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                  <CalendarDays size={13} />
                  Hoy
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gestion/puntoventa"
                className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Nueva venta
              </Link>

              <Link
                href="/gestion/ventas"
                className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Ver ventas
              </Link>
            </div>
          </header>

          {activeSection === "sales" ? (
            <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex shrink-0 flex-wrap gap-2">
                {salesTabs.map((tab) => {
                  const count =
                    tab.id === "local"
                      ? 0
                      : orders.filter(
                          (order) => order.status === tab.statusFilter
                        ).length;
                  const isActive = activeSalesTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSalesTab(tab.id)}
                      className={`h-9 rounded-xl px-3 text-xs font-bold transition ${
                        isActive
                          ? "bg-white text-black"
                          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {tab.label}
                      {tab.id !== "local" && (
                        <span className="ml-2 opacity-70">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeSalesTab === "local" ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
                  <div>
                    <p className="text-lg font-bold text-white">
                      Historial local
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                      Aca vamos a listar las ventas hechas desde punto de venta,
                      con detalle, anulacion y reimpresion del comprobante.
                    </p>
                  </div>
                </div>
              ) : (
                <AdminOrdersSection
                  orders={orders}
                  isLoading={isOrdersLoading}
                  error={orderError}
                  forcedStatusFilter={
                    salesTabs.find((tab) => tab.id === activeSalesTab)
                      ?.statusFilter
                  }
                  onRefresh={refreshOrders}
                  onStatusChange={handleOrderStatusChange}
                  onUpdateInternalNotes={handleUpdateOrderInternalNotes}
                  onDelete={handleDeleteOrder}
                  onDeleteMany={handleDeleteOrders}
                />
              )}
            </section>
          ) : (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Cola de trabajo
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      Lo que hay que resolver
                    </h2>
                  </div>

                  <Clock className="text-zinc-500" size={20} />
                </div>

                <div className="divide-y divide-zinc-800">
                  {workQueues.map((queue) => {
                    const Icon = queue.icon;
                    const content = (
                      <>
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
                          <Icon size={20} />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-base font-bold">
                            {queue.title}
                          </span>
                          <span className="mt-1 block text-sm text-zinc-400">
                            {queue.detail}
                          </span>
                        </span>

                        <span className="text-left md:text-right">
                          <span className="block text-2xl font-bold">
                            {queue.metric}
                          </span>
                          <span className="text-xs font-semibold uppercase text-zinc-500">
                            {queue.label}
                          </span>
                        </span>
                      </>
                    );

                    if (queue.section === "sales") {
                      return (
                        <Link
                          key={queue.title}
                          href="/gestion/ventas"
                          className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-zinc-900 md:grid-cols-[44px_minmax(0,1fr)_120px] md:items-center"
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={queue.title}
                        type="button"
                        onClick={() => setActiveSection(queue.section)}
                        className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-zinc-900 md:grid-cols-[44px_minmax(0,1fr)_120px] md:items-center"
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Modulos preparados
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Proximas pantallas
                  </h2>
                </div>

                <div className="grid gap-2 p-3 md:grid-cols-2">
                  {modules.map((module) => {
                    const Icon = module.icon;

                    const cardClassName = `flex min-h-24 items-start gap-3 rounded-xl border p-3 text-left transition ${
                      module.featured
                        ? "border-emerald-400/50 bg-emerald-400/10 hover:border-emerald-300"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-500"
                    }`;

                    const content = (
                      <>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            module.featured
                              ? "bg-emerald-400 text-black"
                              : "bg-white text-black"
                          }`}
                        >
                          <Icon size={19} />
                        </span>

                        <span className="min-w-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-bold">
                              {module.title}
                            </span>
                            <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                              {module.status}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-zinc-400">
                            {module.description}
                          </span>
                        </span>
                      </>
                    );

                    if (module.featured) {
                      return (
                        <Link
                          key={module.title}
                          href="/gestion/puntoventa"
                          className={cardClassName}
                        >
                          {content}
                        </Link>
                      );
                    }

                    if ("section" in module && module.section === "sales") {
                      return (
                        <Link
                          key={module.title}
                          href="/gestion/ventas"
                          className={cardClassName}
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={module.title}
                        type="button"
                        onClick={() => {
                          if ("section" in module && module.section) {
                            setActiveSection(module.section);
                          }
                        }}
                        className={cardClassName}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Inventario
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Alertas rapidas
                  </h2>
                </div>

                <div className="divide-y divide-zinc-800">
                  {inventoryAlerts.map((alert) => {
                    const Icon = alert.icon;

                    return (
                      <button
                        key={alert.title}
                        type="button"
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-zinc-900"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300">
                          <Icon size={18} />
                        </span>

                        <span>
                          <span className="block font-semibold">
                            {alert.title}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-zinc-400">
                            {alert.detail}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Orden recomendado
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  Migracion de funciones
                </h2>

                <div className="mt-4 grid gap-2 text-sm text-zinc-400">
                  <p className="rounded-xl bg-zinc-900 px-3 py-2">
                    1. Punto de venta separado
                  </p>
                  <p className="rounded-xl bg-zinc-900 px-3 py-2">
                    2. Ventas: pedidos web e historial
                  </p>
                  <p className="rounded-xl bg-zinc-900 px-3 py-2">
                    3. Envios e inventario
                  </p>
                  <p className="rounded-xl bg-zinc-900 px-3 py-2">
                    4. Caja y estadisticas
                  </p>
                </div>
              </div>
            </aside>
          </section>
          )}
        </section>
      </div>

      {gestionNotice && (
        <div
          style={{
            backgroundColor:
              gestionNotice.type === "success" ? "#16a34a" : "#dc2626",
            borderColor:
              gestionNotice.type === "success" ? "#86efac" : "#fca5a5",
            color: "#ffffff",
          }}
          className="fixed left-1/2 top-5 z-[9999] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start justify-between gap-4 rounded-2xl border p-4 text-sm font-semibold shadow-2xl"
        >
          <span>{gestionNotice.message}</span>

          <button
            type="button"
            onClick={() => setGestionNotice(null)}
            className="shrink-0 text-xs font-semibold uppercase tracking-wide opacity-80 transition hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}
    </main>
  );
}
