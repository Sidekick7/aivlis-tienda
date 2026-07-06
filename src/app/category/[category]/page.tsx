"use client";

import ProductCard from "@/components/ProductCard";
import { use, useEffect, useState } from "react";
import { getCategories } from "@/lib/categories";
import {
  curveCategoryLabel,
  curveCategoryValue,
  getPublicProducts,
} from "@/lib/publicProducts";
import type { Product } from "@/types/product";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {

  const { category } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState("");
  const [categoryLabel, setCategoryLabel] = useState(category);

  useEffect(() => {

    const fetchProducts = async () => {
      setProductsError("");

      try {
        const products = (await getPublicProducts()).filter(
          (product) => product.category === category
        );
        const categories = await getCategories();

        setProducts(products);
        setCategoryLabel(
          category === curveCategoryValue
            ? curveCategoryLabel
            : categories.find(
                (categoryOption) =>
                  categoryOption.value === category
              )?.label ?? category
        );
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
            key={product.slug}
            product={product}
          />

        ))}

      </div>

    </main>

  );
}
