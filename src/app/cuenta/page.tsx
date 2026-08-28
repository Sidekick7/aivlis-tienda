"use client";

import { provinces } from "@/config/store";
import {
  emptyCustomerProfile,
  getCustomerProfile,
  saveCustomerProfile,
  type CustomerProfileFields,
} from "@/lib/customerProfiles";
import {
  getCustomerOrders,
  type CustomerOrder,
  type CustomerOrderItem,
} from "@/lib/customerOrders";
import { formatOrderNumber } from "@/lib/orderNumber";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import { buildDirectWhatsAppUrl } from "@/lib/whatsapp";
import { storeConfig } from "@/config/store";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  KeyRound,
  LogOut,
  MessageCircle,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

type AuthMode = "login" | "register";
type AccountSection = "profile" | "orders" | "security";

type CustomerOrderItemGroup = {
  id: string;
  productName: string;
  productSlug: string;
  saleMode: "unit" | "curve";
  bundleQuantity: number;
  bundlePrice: number;
  quantity: number;
  subtotal: number;
  items: CustomerOrderItem[];
};

const orderStatusLabels = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
} as const;

const orderStatusClasses = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
} as const;

const fulfillmentLabels = {
  to_prepare: "A preparar",
  prepared: "Preparado",
  shipped: "Enviado",
} as const;

function getCustomerFulfillmentLabel(order: CustomerOrder) {
  const isPickup = order.deliveryMethod.toLowerCase().includes("retiro");

  if (
    isPickup &&
    order.fulfillmentStatus === "shipped"
  ) {
    return "Preparado";
  }

  if (order.fulfillmentStatus === "delivered") {
    return isPickup ? "Retirado" : "Enviado";
  }

  return fulfillmentLabels[order.fulfillmentStatus];
}

function formatAccountDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function groupCustomerOrderItems(items: CustomerOrderItem[]) {
  const groups = new Map<string, CustomerOrderItemGroup>();

  items.forEach((item) => {
    const key = item.lineGroupId || `item-${item.id}`;
    const current = groups.get(key);

    if (current) {
      current.items.push(item);
      current.quantity += item.quantity;
      current.subtotal += item.subtotal;
      return;
    }

    groups.set(key, {
      id: key,
      productName: item.productName,
      productSlug: item.productSlug,
      saleMode: item.saleMode,
      bundleQuantity: item.bundleQuantity,
      bundlePrice: item.bundlePrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      items: [item],
    });
  });

  return Array.from(groups.values());
}

const fieldLabelClass = "mb-1.5 block text-sm font-medium text-zinc-700";
const fieldClass =
  "h-11 w-full border border-zinc-300 bg-white px-3.5 text-black outline-none transition placeholder:text-zinc-400 focus:border-black";

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (normalizedMessage.includes("email rate limit")) {
    return "Se alcanzó el límite temporal de emails. Esperá unos minutos y volvé a intentar.";
  }

  if (normalizedMessage.includes("already registered")) {
    return "Ese email ya está registrado. Probá iniciar sesión.";
  }

  if (normalizedMessage.includes("password should be")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  return message;
}

export default function AccountPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] =
    useState<AccountSection>("profile");
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [profile, setProfile] = useState<CustomerProfileFields>(
    emptyCustomerProfile
  );
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    let isCurrent = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isCurrent) return;
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isCurrent) return;
      setSession(nextSession);
      setIsAuthLoading(false);

      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      isCurrent = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user = session?.user;
    let isCurrent = true;

    if (!user) {
      queueMicrotask(() => {
        if (!isCurrent) return;
        setProfile(emptyCustomerProfile);
        setIsProfileLoading(false);
      });

      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (!isCurrent) return;
      setIsProfileLoading(true);
      setError("");
    });

    getCustomerProfile(user.id)
      .then((savedProfile) => {
        if (!isCurrent) return;

        setProfile({
          ...(savedProfile ?? emptyCustomerProfile),
          email: savedProfile?.email || user.email || "",
        });
      })
      .catch((profileError) => {
        if (!isCurrent) return;
        setError(
          profileError instanceof Error
            ? profileError.message
            : "No se pudo cargar tu perfil."
        );
      })
      .finally(() => {
        if (isCurrent) setIsProfileLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session?.user) {
      queueMicrotask(() => {
        setOrders([]);
        setOrdersError("");
        setIsOrdersLoading(false);
      });
      return;
    }

    let isCurrent = true;
    const loadOrders = async (showLoading: boolean) => {
      if (showLoading) {
        queueMicrotask(() => {
          if (!isCurrent) return;
          setIsOrdersLoading(true);
          setOrdersError("");
        });
      }

      try {
        const customerOrders = await getCustomerOrders();
        if (!isCurrent) return;
        setOrders(customerOrders);
        setOrdersError("");
      } catch {
        if (isCurrent) {
          setOrdersError("No se pudo cargar el historial de pedidos.");
        }
      } finally {
        if (isCurrent && showLoading) setIsOrdersLoading(false);
      }
    };

    void loadOrders(true);

    const handleWindowFocus = () => {
      void loadOrders(false);
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isCurrent = false;
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [ordersRefreshKey, session]);

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!email.trim() || !password) {
      setError("Completá email y contraseña.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) throw signInError;
        setSession(data.session);
        setMessage("Ingresaste correctamente.");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/cuenta`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          setSession(data.session);
          setMessage("Cuenta creada. Ya podés completar tus datos.");
        } else {
          setMessage(
            "Cuenta creada. Revisá tu email para confirmar el registro."
          );
        }
      }
    } catch (authError) {
      setError(
        getAuthErrorMessage(
          authError instanceof Error
            ? authError.message
            : "No se pudo completar el acceso."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async () => {
    clearFeedback();

    if (!email.trim()) {
      setError("Escribí tu email para recuperar la contraseña.");
      return;
    }

    setIsSubmitting(true);

    const { error: recoveryError } =
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/cuenta`,
      });

    if (recoveryError) {
      setError(getAuthErrorMessage(recoveryError.message));
    } else {
      setMessage("Te enviamos un enlace para cambiar la contraseña.");
    }

    setIsSubmitting(false);
  };

  const handleNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(getAuthErrorMessage(updateError.message));
    } else {
      setNewPassword("");
      setIsRecoveryMode(false);
      setMessage("Contraseña actualizada.");
    }

    setIsSubmitting(false);
  };

  const handleAccountPasswordChange = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    clearFeedback();

    const userEmail = session?.user.email;

    if (!userEmail || !currentPassword) {
      setError("Escribí tu contraseña actual.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    const { error: verificationError } =
      await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

    if (verificationError) {
      setError("La contraseña actual no es correcta.");
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(getAuthErrorMessage(updateError.message));
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Contraseña actualizada.");
    }

    setIsSubmitting(false);
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!session?.user) return;

    setIsSubmitting(true);

    try {
      const savedProfile = await saveCustomerProfile(session.user.id, {
        ...profile,
        email: session.user.email || profile.email,
      });

      setProfile(savedProfile);
      setMessage("Tus datos quedaron guardados.");
    } catch (profileError) {
      setError(
        profileError instanceof Error
          ? profileError.message
          : "No se pudieron guardar tus datos."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProfile = (
    field: keyof CustomerProfileFields,
    value: string
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSignOut = async () => {
    clearFeedback();
    await supabase.auth.signOut();
  };

  if (isAuthLoading) {
    return (
      <main className="home-main-offset min-h-screen bg-zinc-100 px-5 py-10 text-black">
        <p className="mx-auto max-w-6xl text-sm text-zinc-500">
          Cargando cuenta...
        </p>
      </main>
    );
  }

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 md:px-8 md:pt-8">
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-zinc-300 pb-4">
          <div>
            <p className="font-brand text-base uppercase text-zinc-500">
              Clientes
            </p>
            <h1 className="font-brand mt-1 text-4xl leading-none md:text-5xl">
              Mi cuenta
            </h1>
          </div>

          {session && (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex h-10 cursor-pointer items-center gap-2 border border-zinc-300 px-3.5 text-sm font-bold transition hover:bg-white"
            >
              <LogOut size={17} />
              Salir
            </button>
          )}
        </header>

        {(error || message) && (
          <div
            className={`mb-5 border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || message}
          </div>
        )}

        {!session ? (
          <div className="mx-auto max-w-md">
            <div className="grid grid-cols-2 border border-zinc-300 bg-white p-1">
              {(["login", "register"] as AuthMode[]).map((authMode) => (
                <button
                  key={authMode}
                  type="button"
                  onClick={() => {
                    setMode(authMode);
                    clearFeedback();
                  }}
                  className={`h-10 cursor-pointer text-sm font-bold transition ${
                    mode === authMode
                      ? "bg-black text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {authMode === "login" ? "Ingresar" : "Crear cuenta"}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="mt-6 space-y-4">
              <div>
                <label htmlFor="account-email" className={fieldLabelClass}>
                  Email
                </label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="account-password" className={fieldLabelClass}>
                  Contraseña
                </label>
                <input
                  id="account-password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                />
              </div>

              {mode === "register" && (
                <div>
                  <label
                    htmlFor="account-confirm-password"
                    className={fieldLabelClass}
                  >
                    Repetir contraseña
                  </label>
                  <input
                    id="account-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={fieldClass}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full cursor-pointer bg-black px-5 font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Procesando..."
                  : mode === "login"
                    ? "Ingresar"
                    : "Crear cuenta"}
              </button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => void handleRecovery()}
                disabled={isSubmitting}
                className="mt-4 w-full cursor-pointer text-center text-sm font-semibold text-zinc-600 underline underline-offset-4 hover:text-black disabled:cursor-not-allowed"
              >
                Olvidé mi contraseña
              </button>
            )}
          </div>
        ) : isRecoveryMode ? (
          <form
            onSubmit={handleNewPassword}
            className="mx-auto max-w-md border-y border-zinc-300 py-6"
          >
            <h2 className="font-brand text-2xl">Nueva contraseña</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Escribí una contraseña nueva de al menos 6 caracteres.
            </p>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={`${fieldClass} mt-4`}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 h-11 w-full cursor-pointer bg-black px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Guardar contraseña
            </button>
          </form>
        ) : (
          <div>
            <nav
              aria-label="Secciones de mi cuenta"
              className="mb-7 grid grid-cols-3 border-b border-zinc-300"
            >
              <button
                type="button"
                onClick={() => setActiveSection("profile")}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 border-b-2 px-2 text-sm font-bold transition sm:px-4 ${
                  activeSection === "profile"
                    ? "border-black text-black"
                    : "border-transparent text-zinc-500 hover:text-black"
                }`}
              >
                <UserRound size={18} />
                Mis datos
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("orders")}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 border-b-2 px-2 text-sm font-bold transition sm:px-4 ${
                  activeSection === "orders"
                    ? "border-black text-black"
                    : "border-transparent text-zinc-500 hover:text-black"
                }`}
              >
                <PackageOpen size={18} />
                Mis pedidos
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("security")}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 border-b-2 px-2 text-sm font-bold transition sm:px-4 ${
                  activeSection === "security"
                    ? "border-black text-black"
                    : "border-transparent text-zinc-500 hover:text-black"
                }`}
              >
                <ShieldCheck size={18} />
                Seguridad
              </button>
            </nav>

            {activeSection === "profile" && (
              <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
                <aside className="border-b border-zinc-300 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-7">
                  <UserRound size={25} />
                  <h2 className="mt-3 text-lg font-bold">Datos de compra</h2>
                  <p className="mt-1 break-all text-sm text-zinc-600">
                    {session.user.email}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    Se completan automáticamente en tu próximo checkout.
                  </p>
                </aside>

                {isProfileLoading ? (
                  <p className="text-sm text-zinc-500">
                    Cargando tus datos...
                  </p>
                ) : (
                  <form onSubmit={handleProfileSave}>
                    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="profile-name"
                          className={fieldLabelClass}
                        >
                          Nombre y apellido
                        </label>
                        <input
                          id="profile-name"
                          value={profile.name}
                          onChange={(event) =>
                            updateProfile("name", event.target.value)
                          }
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-dni"
                          className={fieldLabelClass}
                        >
                          DNI / CUIT
                        </label>
                        <input
                          id="profile-dni"
                          value={profile.dni}
                          onChange={(event) =>
                            updateProfile("dni", event.target.value)
                          }
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-whatsapp"
                          className={fieldLabelClass}
                        >
                          WhatsApp
                        </label>
                        <input
                          id="profile-whatsapp"
                          value={profile.whatsapp}
                          onChange={(event) =>
                            updateProfile("whatsapp", event.target.value)
                          }
                          className={fieldClass}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="profile-address"
                          className={fieldLabelClass}
                        >
                          Dirección
                        </label>
                        <input
                          id="profile-address"
                          value={profile.address}
                          onChange={(event) =>
                            updateProfile("address", event.target.value)
                          }
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-city"
                          className={fieldLabelClass}
                        >
                          Localidad
                        </label>
                        <input
                          id="profile-city"
                          value={profile.city}
                          onChange={(event) =>
                            updateProfile("city", event.target.value)
                          }
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-province"
                          className={fieldLabelClass}
                        >
                          Provincia
                        </label>
                        <select
                          id="profile-province"
                          value={profile.province}
                          onChange={(event) =>
                            updateProfile("province", event.target.value)
                          }
                          className={fieldClass}
                        >
                          <option value="">Seleccionar provincia</option>
                          {provinces.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="profile-zip"
                          className={fieldLabelClass}
                        >
                          Código postal
                        </label>
                        <input
                          id="profile-zip"
                          value={profile.zip}
                          onChange={(event) =>
                            updateProfile("zip", event.target.value)
                          }
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-email"
                          className={fieldLabelClass}
                        >
                          Email
                        </label>
                        <input
                          id="profile-email"
                          type="email"
                          value={session.user.email || profile.email}
                          readOnly
                          className={`${fieldClass} cursor-not-allowed bg-zinc-200 text-zinc-500`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 bg-black px-6 font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check size={18} />
                      {isSubmitting ? "Guardando..." : "Guardar datos"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeSection === "orders" && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-brand text-2xl">Mis pedidos</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Compras realizadas mientras estabas en esta cuenta.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isOrdersLoading && !ordersError && (
                      <span className="text-sm font-semibold text-zinc-500">
                        {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setOrdersRefreshKey((value) => value + 1)}
                      disabled={isOrdersLoading}
                      title="Actualizar pedidos"
                      aria-label="Actualizar pedidos"
                      className="inline-flex size-9 cursor-pointer items-center justify-center border border-zinc-300 bg-white transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        size={16}
                        className={isOrdersLoading ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                </div>

                {isOrdersLoading ? (
                  <p className="border-y border-zinc-300 py-8 text-sm text-zinc-500">
                    Cargando pedidos...
                  </p>
                ) : ordersError ? (
                  <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {ordersError}
                  </p>
                ) : orders.length === 0 ? (
                  <div className="border-y border-zinc-300 py-10 text-center">
                    <PackageOpen className="mx-auto text-zinc-400" size={30} />
                    <p className="mt-3 font-bold">Todavía no tenés pedidos</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Los próximos pedidos que hagas con esta cuenta aparecerán acá.
                    </p>
                    <Link
                      href="/tienda"
                      className="mt-5 inline-flex h-10 items-center bg-black px-5 text-sm font-bold text-white"
                    >
                      Ir al catálogo
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const itemGroups = groupCustomerOrderItems(order.items);
                      const totalUnits = order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      );

                      return (
                        <details
                          key={order.id}
                          className="group border border-zinc-300 bg-white"
                        >
                          <summary className="grid min-h-20 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:grid-cols-[120px_1fr_auto_auto] sm:px-5 [&::-webkit-details-marker]:hidden">
                            <div>
                              <p className="text-xs uppercase text-zinc-500">
                                Pedido
                              </p>
                              <p className="font-bold">
                                {formatOrderNumber(order.orderNumber)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {formatAccountDate(order.createdAt)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {totalUnits} {totalUnits === 1 ? "prenda" : "prendas"}
                              </p>
                            </div>
                            <span
                              className={`w-fit px-2.5 py-1 text-xs font-bold ${orderStatusClasses[order.status]}`}
                            >
                              {orderStatusLabels[order.status]}
                            </span>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <span className="font-bold">
                                {formatPrice(order.total)}
                              </span>
                              <ChevronDown
                                size={18}
                                className="transition group-open:rotate-180"
                              />
                            </div>
                          </summary>

                          <div className="border-t border-zinc-200 px-4 py-4 sm:px-5">
                            <div className="grid gap-3 border-b border-zinc-200 pb-4 text-sm sm:grid-cols-3">
                              <div>
                                <p className="text-xs uppercase text-zinc-500">Entrega</p>
                                <p className="mt-1 font-semibold">{order.deliveryMethod}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase text-zinc-500">Pago</p>
                                <p className="mt-1 font-semibold">{order.paymentMethod}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase text-zinc-500">Preparación</p>
                                <p className="mt-1 font-semibold">
                                  {order.status === "cancelled"
                                    ? "Sin preparación"
                                    : getCustomerFulfillmentLabel(order)}
                                </p>
                              </div>
                            </div>

                            <div className="divide-y divide-zinc-200">
                              {itemGroups.map((group) => (
                                <div
                                  key={group.id}
                                  className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-start"
                                >
                                  <div>
                                    <Link
                                      href={`/product/${group.productSlug}`}
                                      className="font-bold hover:underline"
                                    >
                                      {group.saleMode === "curve" ? "Curva - " : ""}
                                      {group.productName}
                                    </Link>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
                                      {group.items.map((item) => (
                                        <span key={item.id}>
                                          {[item.variantColor, item.size ? `Talle ${item.size}` : ""]
                                            .filter(Boolean)
                                            .join(" · ")} x {item.quantity}
                                        </span>
                                      ))}
                                    </div>
                                    {group.saleMode === "curve" && (
                                      <p className="mt-1 text-xs text-zinc-500">
                                        {group.bundleQuantity} {group.bundleQuantity === 1 ? "curva" : "curvas"} · {formatPrice(group.bundlePrice)} por curva
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold">
                                    {formatPrice(group.subtotal)}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {(order.shippingCarrier || order.trackingNumber) && (
                              <p className="border-t border-zinc-200 pt-3 text-sm">
                                {order.shippingCarrier || "Envío"}
                                {order.trackingNumber
                                  ? ` · Seguimiento ${order.trackingNumber}`
                                  : ""}
                              </p>
                            )}

                            {order.status === "pending_payment" && (
                              <p className="mt-3 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                                El stock está reservado. Una vez que nos comuniquemos,
                                tenés 48 horas para abonar el pedido.
                              </p>
                            )}

                            {storeConfig.whatsappNumber && (
                              <a
                                href={buildDirectWhatsAppUrl({
                                  number: storeConfig.whatsappNumber,
                                  message: `Hola! Quiero consultar por mi pedido ${formatOrderNumber(order.orderNumber)}.`,
                                })}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex h-10 items-center gap-2 border border-zinc-300 px-4 text-sm font-bold transition hover:border-black"
                              >
                                <MessageCircle size={17} />
                                Consultar pedido
                              </a>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {activeSection === "security" && (
              <section className="mx-auto max-w-2xl">
                <div className="border-b border-zinc-300 pb-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={24} />
                    <div>
                      <h2 className="font-brand text-2xl">Seguridad</h2>
                      <p className="mt-1 break-all text-sm text-zinc-600">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAccountPasswordChange} className="py-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="security-current-password"
                        className={fieldLabelClass}
                      >
                        Contraseña actual
                      </label>
                      <input
                        id="security-current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="security-password"
                        className={fieldLabelClass}
                      >
                        Nueva contraseña
                      </label>
                      <input
                        id="security-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center gap-2 bg-black px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <KeyRound size={17} />
                    {isSubmitting ? "Actualizando..." : "Cambiar contraseña"}
                  </button>
                </form>

                <div className="flex items-center justify-between gap-4 border-t border-zinc-300 pt-5">
                  <div>
                    <p className="font-bold">Cerrar sesión</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Cerrá el acceso en este dispositivo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 border border-zinc-300 px-4 text-sm font-bold hover:border-black"
                  >
                    <LogOut size={17} />
                    Salir
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
