"use client";

import { useState } from "react";
import { useSearch } from "@/context/SearchContext";
import { products } from "@/data/products";
import Link from "next/link";

export default function SearchModal() {

  const {
    isSearchOpen,
    setIsSearchOpen,
  } = useSearch();

  const [query, setQuery] = useState("");

  const filteredProducts = products.filter((product) =>
    product.name
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-10 overflow-y-auto">

      <div className="max-w-2xl mx-auto">

        <input
          type="text"
          placeholder="Buscar producto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 text-white outline-none"
        />

        <div className="mt-6 flex flex-col gap-3">

          {filteredProducts.map((product) => (

            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={() => setIsSearchOpen(false)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-white transition"
            >
              <div className="flex items-center gap-4">

                <img
                  src={product.images[0]}
                  alt={product.name}
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
          className="mt-8 text-zinc-400 hover:text-white transition"
        >
          Cerrar
        </button>

      </div>

    </div>
  );
}