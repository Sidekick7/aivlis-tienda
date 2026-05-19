"use client";

import ProductCard from "@/components/ProductCard";
import { use, useEffect, useState } from "react";
import { getProductsByCategory } from "@/lib/products";
import { getCategoryLabel } from "@/config/store";
import type { Product } from "@/types/product";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {

  const { category } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState("");
  const categoryLabel = getCategoryLabel(category);

  useEffect(() => {

    const fetchProducts = async () => {
      setProductsError("");

      try {
        const products = await getProductsByCategory(
          category
        );

        setProducts(products);
      } catch {
        setProductsError("No se pudo cargar esta categoría.");
      }

    };

    fetchProducts();

  }, [category]);

  return (

    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold mb-10 capitalize">
        {categoryLabel}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {productsError && (
          <p className="text-zinc-400">
            {productsError}
          </p>
        )}

        {products.map((product) => (

          <ProductCard
            key={product.id}
            product={product}
          />

        ))}

      </div>

    </main>

  );
}
