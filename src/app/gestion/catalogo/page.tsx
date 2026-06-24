"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Images,
  LogOut,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { getProductImage } from "@/lib/productDisplay";
import { getProducts } from "@/lib/products";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/product";
import type { Session } from "@supabase/supabase-js";

type CatalogFilter = "all" | "active" | "inactive" | "in_stock" | "out";

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
    active: true,
  },
];

const catalogFilters: Array<{
  label: string;
  value: CatalogFilter;
}> = [
  { label: "Todos", value: "all" },
  { label: "Publicado", value: "active" },
  { label: "Oculto", value: "inactive" },
  { label: "Con stock", value: "in_stock" },
  { label: "Sin stock", value: "out" },
];

function getShortSku(sku?: string | null) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku || "-";
}

function getProductStock(product: Product) {
  return product.variants.reduce(
    (total, variant) =>
      total + variant.sizes.reduce((sum, size) => sum + size.stock, 0),
    0
  );
}

function getProductImages(product: Product) {
  const images = [
    ...product.images,
    ...product.variants.flatMap((variant) => variant.images),
  ].filter(Boolean);

  return Array.from(new Set(images));
}

export default function GestionCatalogoPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>("active");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [selectedDetailImageIndex, setSelectedDetailImageIndex] = useState(0);
  const [selectedDetailVariantIndex, setSelectedDetailVariantIndex] =
    useState(0);

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

  const refreshProducts = async () => {
    setIsLoadingProducts(true);
    setCatalogError("");

    try {
      const nextProducts = await getProducts({
        includeInactive: true,
      });

      setProducts(nextProducts);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catalogo."
      );
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;

    queueMicrotask(() => {
      void refreshProducts();
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
    setProducts([]);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => {
        const stock = getProductStock(product);
        const matchesFilter =
          activeFilter === "all" ||
          (activeFilter === "active" && product.active) ||
          (activeFilter === "inactive" && !product.active) ||
          (activeFilter === "in_stock" && stock > 0) ||
          (activeFilter === "out" && stock <= 0);
        const matchesSearch =
          !normalizedSearch ||
          [
            product.name,
            product.sku ?? "",
            getShortSku(product.sku),
            product.category,
            product.slug,
            ...product.variants.map((variant) => variant.color),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesFilter && matchesSearch;
      })
      .sort((firstProduct, secondProduct) => secondProduct.id - firstProduct.id);
  }, [activeFilter, normalizedSearch, products]);

  const filterCounts: Record<CatalogFilter, number> = {
    all: products.length,
    active: products.filter((product) => product.active).length,
    inactive: products.filter((product) => !product.active).length,
    in_stock: products.filter((product) => getProductStock(product) > 0).length,
    out: products.filter((product) => getProductStock(product) <= 0).length,
  };

  if (isAuthLoading || isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <p className="text-sm font-semibold text-zinc-400">
          Cargando catalogo...
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
            Catalogo
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entra con las mismas credenciales de Gestion para ver productos,
            fotos y stock.
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

          {authMessage && (
            <p className="mt-4 text-sm text-zinc-400">
              {authMessage}
            </p>
          )}
        </form>
      </main>
    );
  }

  const detailImages = detailProduct ? getProductImages(detailProduct) : [];
  const safeDetailImageIndex =
    detailImages.length > 0
      ? Math.min(selectedDetailImageIndex, detailImages.length - 1)
      : 0;
  const selectedDetailImage =
    detailImages[safeDetailImageIndex] ||
    (detailProduct ? getProductImage(detailProduct) : "");
  const safeDetailVariantIndex = detailProduct
    ? Math.min(
        selectedDetailVariantIndex,
        detailProduct.variants.length - 1
      )
    : 0;
  const selectedDetailVariant =
    detailProduct?.variants[safeDetailVariantIndex] ?? null;

  return (
    <main className="min-h-screen bg-[#090909] text-white lg:h-screen lg:overflow-hidden">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-3 lg:hidden">
        <Link
          href="/"
          className="text-lg font-black tracking-[0.28em] text-white"
        >
          AIVLIS
        </Link>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-black uppercase text-zinc-300">
          Catalogo
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="h-9 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-zinc-300"
        >
          Salir
        </button>
      </div>

      <div className="grid min-h-screen lg:h-full lg:min-h-0 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="hidden border-b border-zinc-800 bg-zinc-950 px-2 py-3 lg:block lg:border-b-0 lg:border-r lg:overflow-y-auto">
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

        <section className="min-h-0 min-w-0 px-3 py-3 lg:flex lg:flex-col lg:overflow-hidden">
          <header className="sticky top-14 z-20 -mx-3 border-b border-zinc-800 bg-[#090909]/95 px-3 pb-3 pt-3 backdrop-blur lg:static lg:mx-0 lg:shrink-0 lg:rounded-2xl lg:border lg:bg-zinc-950 lg:p-3">
            <div className="hidden flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Gestion
                </p>
                <h1 className="text-2xl font-black text-white">
                  Catalogo interno
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/catalogo-imprimible"
                  target="_blank"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-black text-white ring-1 ring-zinc-800 transition hover:bg-zinc-800"
                >
                  <Printer size={16} />
                  Pagina imprimible
                </Link>
                <button
                  type="button"
                  onClick={() => void refreshProducts()}
                  disabled={isLoadingProducts}
                  className="h-10 rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingProducts ? "Cargando..." : "Actualizar"}
                </button>
              </div>
            </div>

            <div className="grid gap-2 lg:mt-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:block">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por nombre, SKU, categoria o color"
                  className="h-11 w-full rounded-xl bg-zinc-900 pl-10 pr-3 text-sm font-semibold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                />
              </label>
              <Link
                href="/catalogo-imprimible"
                target="_blank"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200 lg:hidden"
                aria-label="Abrir pagina imprimible"
              >
                <Printer size={16} />
              </Link>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                {catalogFilters.map((filter) => {
                  const isActive = activeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                      className={`h-10 shrink-0 rounded-xl px-3 text-xs font-black transition ${
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
            </div>
          </header>

          {catalogError && (
            <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {catalogError}
            </p>
          )}

          <div className="mt-3 min-h-0 lg:flex-1 lg:overflow-y-auto">
            {isLoadingProducts && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
                Cargando productos...
              </p>
            )}

            {!isLoadingProducts && visibleProducts.length === 0 && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
                No hay productos para este filtro.
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleProducts.map((product) => {
                const stock = getProductStock(product);
                const image = getProductImage(product);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setDetailProduct(product);
                      setSelectedDetailImageIndex(0);
                      setSelectedDetailVariantIndex(0);
                    }}
                    className="group grid grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-left transition hover:border-zinc-600 sm:block"
                  >
                    <div className="relative h-full min-h-32 bg-zinc-900 sm:aspect-[4/5] sm:h-auto">
                      <Image
                        src={image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-black sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs ${
                          product.active
                            ? "bg-emerald-500/90 text-black"
                            : "bg-zinc-950/90 text-zinc-200"
                        }`}
                      >
                        {product.active ? "Publicado" : "Oculto"}
                      </span>
                      <span
                        className={`absolute bottom-1.5 right-1.5 rounded-full px-2 py-0.5 text-[10px] font-black sm:bottom-3 sm:right-3 sm:px-2.5 sm:py-1 sm:text-xs ${
                          stock > 0
                            ? "bg-emerald-950/90 text-emerald-100"
                            : "bg-red-950/90 text-red-100"
                        }`}
                      >
                        Stock {stock}
                      </span>
                    </div>

                    <div className="grid min-w-0 gap-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {product.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
                            SKU {getShortSku(product.sku)} · {product.category}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Mayorista</p>
                        <p className="truncate text-lg font-black text-white">
                          {formatPrice(product.price)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {product.variants.slice(0, 4).map((variant) => (
                          <span
                            key={`${product.id}-${variant.color}`}
                            className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-1 text-xs font-bold text-zinc-300"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-zinc-700"
                              style={{
                                backgroundColor: variant.hex || "#000000",
                              }}
                            />
                            {variant.color}
                          </span>
                        ))}
                        {product.variants.length > 4 && (
                          <span className="rounded-full bg-zinc-900 px-2 py-1 text-xs font-bold text-zinc-500">
                            +{product.variants.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-3">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 sm:rounded-3xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 p-3 sm:p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  SKU {getShortSku(detailProduct.sku)}
                </p>
                <h2 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">
                  {detailProduct.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  {detailProduct.category} · Stock {getProductStock(detailProduct)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                <div className="grid gap-3">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-900">
                    <Image
                      src={selectedDetailImage}
                      alt={detailProduct.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 520px"
                      className="object-cover"
                    />
                  </div>

                  {detailImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {detailImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedDetailImageIndex(index)}
                          className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border transition ${
                            safeDetailImageIndex === index
                              ? "border-white"
                              : "border-zinc-800 opacity-70"
                          }`}
                          aria-label={`Ver imagen ${index + 1}`}
                        >
                          <Image
                            src={image}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid content-start gap-3">
                  <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-zinc-500">
                        Precio mayorista
                      </p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {formatPrice(detailProduct.price)}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="mb-2 text-xs font-bold uppercase text-zinc-500">
                      Colores
                    </p>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {detailProduct.variants.map((variant, index) => {
                        const variantStock = variant.sizes.reduce(
                          (total, size) => total + size.stock,
                          0
                        );
                        const isSelected =
                          safeDetailVariantIndex === index;

                        return (
                          <button
                            key={`${detailProduct.id}-${variant.color}`}
                            type="button"
                            onClick={() =>
                              setSelectedDetailVariantIndex(index)
                            }
                            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                              isSelected
                                ? "border-white bg-zinc-950 text-white"
                                : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-zinc-700"
                              style={{
                                backgroundColor: variant.hex || "#000000",
                              }}
                            />
                            {variant.color}
                            <span className="rounded bg-zinc-900 px-1.5 py-0.5">
                              {variantStock}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {selectedDetailVariant && (
                    <section
                      className={`rounded-2xl border border-zinc-800 p-3 ${
                        selectedDetailVariant.sizes.some(
                          (size) => size.stock > 0
                        )
                          ? "bg-zinc-900/70"
                          : "bg-zinc-900/30 opacity-70"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-5 w-5 shrink-0 rounded-full border border-zinc-700"
                            style={{
                              backgroundColor:
                                selectedDetailVariant.hex || "#000000",
                            }}
                          />
                          <h3 className="truncate text-sm font-black text-white">
                            {selectedDetailVariant.color}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {selectedDetailVariant.sizes.map((size) => (
                          <span
                            key={`${selectedDetailVariant.color}-${size.size}`}
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                              size.stock > 0
                                ? "bg-zinc-950 text-zinc-300"
                                : "bg-zinc-950 text-zinc-600"
                            }`}
                          >
                            <span
                              className={
                                size.stock > 0 ? "" : "line-through"
                              }
                            >
                              {size.size}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-black ${
                                size.stock > 0
                                  ? "bg-emerald-900/80 text-emerald-100"
                                  : "bg-zinc-900 text-zinc-600"
                              }`}
                            >
                              {size.stock}
                            </span>
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
