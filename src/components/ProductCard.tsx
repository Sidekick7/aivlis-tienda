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
  const visibleSizes = sizes.slice(0, 4);
  const hiddenSizesCount = Math.max(sizes.length - visibleSizes.length, 0);
  const visibleVariants = product.variants.slice(0, 4);
  const hiddenVariantsCount = Math.max(
    product.variants.length - visibleVariants.length,
    0
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 sm:rounded-2xl sm:hover:-translate-y-2 sm:hover:shadow-2xl sm:hover:shadow-black/50">
      <Link href={`/product/${product.slug}`}>
        <Image
          src={productImage}
          alt={product.name}
          width={380}
          height={520}
          className="h-[280px] w-full object-cover transition duration-500 hover:scale-105 sm:h-[420px] md:h-[480px] lg:h-[520px]"
        />
      </Link>

      <div className="flex min-h-[130px] flex-1 flex-col p-3 sm:min-h-[170px] sm:p-5">
        <Link href={`/product/${product.slug}`}>
          <h2 className="line-clamp-2 text-base font-semibold leading-tight sm:text-2xl">
            {product.name}
          </h2>
        </Link>

        <p className="mt-1 text-sm text-zinc-600 sm:mt-2 sm:text-base">
          ${product.price}
        </p>

        <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
          {visibleVariants.map((variant) => (
            <div
              key={variant.color}
              title={variant.color}
              className="h-3 w-3 rounded-full border border-zinc-400 sm:h-4 sm:w-4"
              style={{
                backgroundColor: variant.hex,
              }}
            />
          ))}

          {hiddenVariantsCount > 0 && (
            <div className="text-[10px] font-semibold text-zinc-500 sm:text-xs">
              +{hiddenVariantsCount}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
          {visibleSizes.map((size) => (
            <div
              key={size}
              className="flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-400 px-1.5 text-[10px] text-zinc-600 sm:h-8 sm:min-w-8 sm:px-2 sm:text-xs"
            >
              {size}
            </div>
          ))}

          {hiddenSizesCount > 0 && (
            <div className="flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-300 px-1.5 text-[10px] text-zinc-500 sm:h-8 sm:min-w-8 sm:px-2 sm:text-xs">
              +{hiddenSizesCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
