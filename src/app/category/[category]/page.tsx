"use client";

import ProductCard from "@/components/ProductCard";
import { use, useEffect, useState } from "react";
import { getProductsByCategory } from "@/lib/products";
import type { Product } from "@/types/product";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {

  const { category } = use(params);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {

    const fetchProducts = async () => {

      const products = await getProductsByCategory(
        category
      );

      setProducts(products);

    };

    fetchProducts();

  }, [category]);

  return (

    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold mb-10 capitalize">
        {category}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

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
