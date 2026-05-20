"use client";

import Image from "next/image";
import Link from "next/link";
import { getProductImage } from "@/lib/productDisplay";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const productImage = getProductImage(product);
  const sizes = Array.from(
    new Set(
      product.variants.flatMap((variant) =>
        variant.sizes.map((sizeItem) => sizeItem.size)
      )
    )
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/50">
      <Link href={`/product/${product.slug}`}>
        <Image
          src={productImage}
          alt={product.name}
          width={380}
          height={520}
          className="h-[420px] w-full object-cover transition duration-500 hover:scale-105 sm:h-[480px] lg:h-[520px]"
        />
      </Link>

      <div className="flex min-h-[170px] flex-1 flex-col p-5">
        <Link href={`/product/${product.slug}`}>
          <h2 className="line-clamp-2 text-2xl font-semibold">
            {product.name}
          </h2>
        </Link>

        <p className="mt-2 text-zinc-600">
          ${product.price}
        </p>

        <div className="mt-2 flex items-center gap-2">
          {product.variants?.map((variant) => (
            <div
              key={variant.color}
              className="h-4 w-4 rounded-full border border-zinc-400"
              style={{
                backgroundColor: variant.hex,
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {sizes.map((size) => (
            <div
              key={size}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-400 text-xs text-zinc-600"
            >
              {size}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
