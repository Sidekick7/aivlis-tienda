"use client";

import Link from "next/link";

type Props = {
  product: {
    id: number;
    slug: string;
    name: string;
    price: number;
    variants: {
      color: string;
      images: string[];
    }[];
  };

  addToCart?: (product: any) => void;
};

export default function ProductCard({
  product,
  addToCart,
}: Props) {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/50">

      <Link href={`/product/${product.slug}`}>

        <img
          src={product.variants[0].images[0]}
          alt={product.name}
          className="w-full h-[400px] object-cover transition duration-500 hover:scale-105"
        />

        <div className="p-5">

          <h2 className="text-2xl font-semibold">
            {product.name}
          </h2>

          <p className="mt-2 text-zinc-400">
            ${product.price}
          </p>

        </div>

      </Link>

      <div className="px-5 pb-5">

        <button
          onClick={() => addToCart?.(product)}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:opacity-90 transition"
        >
          Agregar al carrito
        </button>

      </div>

    </div>
  );
}