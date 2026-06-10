"use client";

import Image from "next/image";
import Link from "next/link";
import { getProductImage } from "@/lib/productDisplay";
import {
  formatPrice,
  getRetailPrice,
  hasDifferentRetailPrice,
} from "@/lib/pricing";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const productImage = getProductImage(product);
  const hoverImage =
    product.images[1] ||
    product.variants
      .flatMap((variant) => variant.images)
      .find((image) => image !== productImage);
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
  const retailPrice = getRetailPrice(product);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 sm:rounded-2xl sm:hover:-translate-y-2 sm:hover:shadow-2xl sm:hover:shadow-black/50">
      <Link
        href={`/product/${product.slug}`}
        className="group/image relative block overflow-hidden"
      >
        <Image
          src={productImage}
          alt={product.name}
          width={380}
          height={520}
          className="h-[230px] w-full object-cover transition duration-500 group-hover/image:scale-105 sm:h-[330px] md:h-[370px] lg:h-[400px]"
        />

        {hoverImage && (
          <Image
            src={hoverImage}
            alt=""
            width={380}
            height={520}
            aria-hidden="true"
            className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition duration-500 md:block md:group-hover/image:opacity-100"
          />
        )}
      </Link>

      <div className="flex min-h-[115px] flex-1 flex-col p-3 sm:min-h-[145px] sm:p-4">
        <Link href={`/product/${product.slug}`}>
          <h2 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-xl">
            {product.name}
          </h2>
        </Link>

        <div className="mt-2">
          <p className="text-xs font-semibold text-black sm:text-sm">
            Mayorista {formatPrice(product.price)}
          </p>

          {hasDifferentRetailPrice(product) && (
            <p className="text-[11px] text-zinc-500 sm:text-xs">
              Minorista {formatPrice(retailPrice)}
            </p>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 sm:gap-2">
          {visibleVariants.map((variant) => (
            <div
              key={variant.color}
              title={variant.color}
              className="h-3 w-3 rounded-full border border-zinc-400"
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

        <div className="mt-1.5 flex flex-wrap gap-1.5 sm:gap-2">
          {visibleSizes.map((size) => (
            <div
              key={size}
              className="flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-400 px-1.5 text-[10px] text-zinc-600"
            >
              {size}
            </div>
          ))}

          {hiddenSizesCount > 0 && (
            <div className="flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-300 px-1.5 text-[10px] text-zinc-500">
              +{hiddenSizesCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
