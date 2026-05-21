"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearch } from "@/context/SearchContext";
import { getProducts } from "@/lib/products";
import { getProductImage } from "@/lib/productDisplay";
import {
  formatPrice,
  getRetailPrice,
  hasDifferentRetailPrice,
} from "@/lib/pricing";
import type { Product } from "@/types/product";

export default function SearchModal() {
  const { isSearchOpen, setIsSearchOpen } = useSearch();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const closeSearch = useCallback(() => {
    setQuery("");
    setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || products.length > 0) return;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      setProductsError("");

      try {
        const products = await getProducts();

        setProducts(products);
      } catch {
        setProductsError("No se pudo cargar la búsqueda.");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [isSearchOpen, products.length]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSearch, isSearchOpen]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = normalizedQuery
    ? products.filter((product) =>
        product.name.toLowerCase().includes(normalizedQuery)
      )
    : products;

  if (!isSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-10 backdrop-blur-sm"
      onClick={closeSearch}
    >
      <div
        className="relative mx-auto max-w-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Buscar producto..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-white outline-none"
        />

        <div className="mt-6 flex flex-col gap-3">
          {isLoadingProducts && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
              Cargando productos...
            </p>
          )}

          {productsError && (
            <p className="text-zinc-400">
              {productsError}
            </p>
          )}

          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={closeSearch}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-white"
            >
              <div className="flex items-center gap-4">
                <Image
                  src={getProductImage(product)}
                  alt={product.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-xl object-cover"
                />

                <div>
                  <p className="text-lg font-semibold">
                    {product.name}
                  </p>

                  <p className="text-zinc-300">
                    Mayorista {formatPrice(product.price)}
                  </p>

                  {hasDifferentRetailPrice(product) && (
                    <p className="text-sm text-zinc-500">
                      Minorista {formatPrice(getRetailPrice(product))}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {normalizedQuery &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
                No hay productos que coincidan con la búsqueda.
              </p>
            )}
        </div>

        <button
          type="button"
          onClick={closeSearch}
          className="absolute right-5 top-5 text-zinc-400 transition hover:text-white"
          aria-label="Cerrar búsqueda"
        >
          <X />
        </button>
      </div>
    </div>
  );
}
