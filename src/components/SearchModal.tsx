"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSearch } from "@/context/SearchContext";
import { getProducts } from "@/lib/products";
import { getProductImage } from "@/lib/productDisplay";
import type { Product } from "@/types/product";
import Link from "next/link";

export default function SearchModal() {

  const {
    isSearchOpen,
    setIsSearchOpen,
  } = useSearch();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    if (!isSearchOpen || products.length > 0) return;

    const fetchProducts = async () => {
      try {
        const products = await getProducts();

        setProducts(products);
      } catch {
        setProductsError("No se pudo cargar la búsqueda.");
      }
    };

    fetchProducts();
  }, [isSearchOpen, products.length]);

  const filteredProducts = products.filter((product) =>
    product.name
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (!isSearchOpen) return null;

  return (
    <div className="relative fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-10 overflow-y-auto">

      <div className="max-w-2xl mx-auto">

        <input
          type="text"
          placeholder="Buscar producto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 text-white outline-none"
        />

        <div className="mt-6 flex flex-col gap-3">
          {productsError && (
            <p className="text-zinc-400">
              {productsError}
            </p>
          )}

          {filteredProducts.map((product) => (

            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={() => setIsSearchOpen(false)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-white transition"
            >
              <div className="flex items-center gap-4">

                <Image
                  src={getProductImage(product)}
                  alt={product.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover rounded-xl"
                />

                <div>
                  <p className="font-semibold text-lg">
                    {product.name}
                  </p>

                  <p className="text-zinc-400">
                    ${product.price}
                  </p>
                </div>

              </div>
            </Link>

          ))}

        </div>

        <button
          onClick={() => setIsSearchOpen(false)}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white transition"
        >
          ✕
        </button>

      </div>

    </div>
  );
}
