"use client";

import ProductCard from "@/components/ProductCard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {

  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {

    const fetchProducts = async () => {

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category", params.category);

      setProducts(data || []);

    };

    fetchProducts();

  }, [params.category]);

  return (

    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold mb-10 capitalize">
        {params.category}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

        {products.map((product) => (

          <ProductCard
            key={product.id}
            product={product}
            addToCart={addToCart}
          />

        ))}

      </div>

    </main>

  );
}