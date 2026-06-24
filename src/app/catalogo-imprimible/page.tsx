"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { getProductImage } from "@/lib/productDisplay";
import { getProducts } from "@/lib/products";
import { formatPrice } from "@/lib/pricing";
import type { Product } from "@/types/product";

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

function getAvailableSizes(product: Product) {
  return Array.from(
    new Set(
      product.variants.flatMap((variant) =>
        variant.sizes
          .filter((size) => size.stock > 0)
          .map((size) => size.size)
      )
    )
  );
}

function getAvailableColors(product: Product) {
  return product.variants.filter((variant) =>
    variant.sizes.some((size) => size.stock > 0)
  );
}

export default function PrintableCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setError("");

      try {
        const nextProducts = await getProducts();

        if (!isCurrent) return;

        setProducts(nextProducts);
      } catch (loadError) {
        if (!isCurrent) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el catalogo."
        );
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
  }, []);

  const printableProducts = useMemo(
    () =>
      products
        .filter((product) => product.active)
        .sort((firstProduct, secondProduct) => secondProduct.id - firstProduct.id),
    [products]
  );
  const updatedAt = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-white text-zinc-950 print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
            size: A4;
          }

          .no-print {
            display: none !important;
          }

          .catalog-card {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/gestion/catalogo"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800"
          >
            <Printer size={16} />
            Imprimir / guardar PDF
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-7 print:px-0 print:py-0">
        <header className="mb-6 border-b-2 border-zinc-950 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                Catalogo mayorista
              </p>
              <h1 className="mt-1 text-4xl font-black tracking-tight">
                AIVLIS
              </h1>
            </div>

            <div className="text-left text-sm font-bold text-zinc-600 sm:text-right">
              <p>Actualizado: {updatedAt}</p>
              <p>WhatsApp: +54 9 11 6451-3813</p>
              <p>Instagram: @aivlis.ind</p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm font-semibold text-zinc-600">
            Precios mayoristas. Stock sujeto a disponibilidad al momento de
            confirmar el pedido.
          </p>
        </header>

        {isLoading && (
          <p className="rounded-2xl border border-zinc-200 p-8 text-center text-sm font-bold text-zinc-500">
            Cargando catalogo...
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {!isLoading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {printableProducts.map((product) => {
              const image = getProductImage(product);
              const availableColors = getAvailableColors(product);
              const availableSizes = getAvailableSizes(product);
              const hasStock = getProductStock(product) > 0;

              return (
                <article
                  key={product.id}
                  className="catalog-card overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:rounded-xl print:shadow-none"
                >
                  <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-3 p-3">
                    <div className="aspect-[4/5] overflow-hidden rounded-xl bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-black">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs font-bold uppercase text-zinc-500">
                            SKU {getShortSku(product.sku)} · {product.category}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                            hasStock
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {hasStock ? "Disponible" : "Sin stock"}
                        </span>
                      </div>

                      <p className="mt-3 text-2xl font-black">
                        {formatPrice(product.price)}
                      </p>
                      <p className="text-[11px] font-bold uppercase text-zinc-500">
                        Precio mayorista
                      </p>

                      <div className="mt-3 grid gap-2">
                        <div>
                          <p className="text-[11px] font-black uppercase text-zinc-500">
                            Colores
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {availableColors.length > 0 ? (
                              availableColors.map((variant) => (
                                <span
                                  key={`${product.id}-${variant.color}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-bold"
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-full border border-zinc-300"
                                    style={{
                                      backgroundColor: variant.hex || "#000000",
                                    }}
                                  />
                                  {variant.color}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-semibold text-zinc-400">
                                Consultar
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase text-zinc-500">
                            Talles
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {availableSizes.length > 0 ? (
                              availableSizes.map((size) => (
                                <span
                                  key={`${product.id}-${size}`}
                                  className="rounded-full bg-zinc-950 px-2 py-0.5 text-[11px] font-black text-white"
                                >
                                  {size}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-semibold text-zinc-400">
                                Consultar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
