"use client";

import Image from "next/image";
import Link from "next/link";
import {
  getCurveUnitsPerSet,
  isCurveProduct,
} from "@/lib/curve";
import { getProductImage } from "@/lib/productDisplay";
import {
  getPublicProductName,
  isPublicCurveProduct,
} from "@/lib/publicProducts";
import {
  formatPrice,
  getEffectiveWebUnitPrice,
  getRegularWebUnitPrice,
  isProductSaleActive,
} from "@/lib/pricing";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const productName = getPublicProductName(product);
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
  const canBuyCurve = isCurveProduct(product);
  const isCurvePublication = isPublicCurveProduct(product);
  const priceMode = isCurvePublication ? "curve" : "unit";
  const isOnSale = isProductSaleActive(product, priceMode);
  const curveUnitsPerSet = getCurveUnitsPerSet(product.variants[0]);
  const unitReferencePrice = product.price;
  const regularPublishedUnitPrice = getRegularWebUnitPrice(
    product,
    priceMode
  );
  const publishedUnitPrice = getEffectiveWebUnitPrice(product, priceMode);
  const curveUnitPrice = getEffectiveWebUnitPrice(product, "curve");
  const curveSetPrice = curveUnitPrice * curveUnitsPerSet;
  const regularCurveSetPrice =
    getRegularWebUnitPrice(product, "curve") * curveUnitsPerSet;
  const curveSavings = Math.max(
    (isOnSale
      ? regularCurveSetPrice
      : unitReferencePrice * curveUnitsPerSet) - curveSetPrice,
    0
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 sm:rounded-2xl sm:hover:-translate-y-2 sm:hover:shadow-2xl sm:hover:shadow-black/50">
      <Link
        href={`/product/${product.slug}`}
        className="group/image relative block overflow-hidden"
      >
        <Image
          src={productImage}
          alt={productName}
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

        {isCurvePublication && (
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
            <span className="bg-red-700 px-2.5 py-1 text-[11px] font-black uppercase leading-none text-white sm:text-xs">
              Curva
            </span>
          </div>
        )}

        {isOnSale && (
          <span className="absolute right-2 top-2 z-10 bg-red-700 px-2.5 py-1 text-[11px] font-black uppercase leading-none text-white sm:right-3 sm:top-3 sm:text-xs">
            Sale
          </span>
        )}
      </Link>

      <div className="flex min-h-[115px] flex-1 flex-col p-3 sm:min-h-[145px] sm:p-4">
        <Link href={`/product/${product.slug}`}>
          <h2 className="font-brand line-clamp-2 text-sm leading-tight sm:text-xl">
            {productName}
          </h2>
        </Link>

        {isCurvePublication && curveUnitsPerSet > 1 ? (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-zinc-500 line-through sm:text-base">
                {formatPrice(
                  isOnSale
                    ? regularCurveSetPrice
                    : unitReferencePrice * curveUnitsPerSet
                )}
              </span>

              <span
                className={
                  isOnSale
                    ? "text-lg font-semibold text-red-700 sm:text-xl"
                    : "text-base font-semibold text-black sm:text-lg"
                }
              >
                {formatPrice(curveSetPrice)}
              </span>
            </div>

            {curveSavings > 0 && !isOnSale && (
              <p className="text-xs font-bold text-red-700 sm:text-sm">
                ahorro {formatPrice(curveSavings)}
              </p>
            )}
          </div>
        ) : canBuyCurve && curveUnitsPerSet > 1 ? (
          <div className="mt-2">
            {isOnSale ? (
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-zinc-500 line-through sm:text-base">
                    {formatPrice(regularPublishedUnitPrice)}
                  </span>
                  <span className="text-lg font-semibold text-red-700 sm:text-xl">
                    {formatPrice(publishedUnitPrice)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-black sm:text-base">
                {formatPrice(unitReferencePrice)}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2">
            {isOnSale ? (
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-zinc-500 line-through sm:text-base">
                    {formatPrice(regularPublishedUnitPrice)}
                  </span>
                  <span className="text-lg font-semibold text-red-700 sm:text-xl">
                    {formatPrice(publishedUnitPrice)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-black sm:text-base">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
        )}

        {product.variants.length > 1 && (
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
        )}

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
