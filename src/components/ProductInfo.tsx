"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Barcode,
  CheckCircle,
  Tag,
  Truck,
} from "lucide-react";
import { fallbackProductImage } from "@/config/store";
import { useCart } from "@/context/CartContext";
import { getCategories } from "@/lib/categories";
import {
  getCurveLabel,
  getCurveSizesFromVariant,
  getCurveStockLimit,
  getCurveUnitsPerSet,
  isCurveProduct,
} from "@/lib/curve";
import {
  formatPrice,
  getRetailPrice,
  hasDifferentRetailPrice,
} from "@/lib/pricing";
import type { Product, ProductVariant } from "@/types/product";

type Props = {
  product: Product;
};

function getDefaultSize(variant?: ProductVariant) {
  return (
    variant?.sizes.find((sizeItem) => sizeItem.stock > 0)?.size ||
    variant?.sizes[0]?.size ||
    ""
  );
}

function getDisplaySku(product: Product) {
  const sku = product.sku || product.slug;

  return sku.startsWith("AIV-") ? sku.replace("AIV-", "") : sku;
}

const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function sortSizes(sizes: string[]) {
  return [...sizes].sort((firstSize, secondSize) => {
    const firstIndex = sizeOrder.indexOf(firstSize.toUpperCase());
    const secondIndex = sizeOrder.indexOf(secondSize.toUpperCase());

    if (firstIndex !== -1 || secondIndex !== -1) {
      return (
        (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex) -
        (secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex)
      );
    }

    return firstSize.localeCompare(secondSize, "es", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export default function ProductInfo({ product }: Props) {
  const [categoryLabel, setCategoryLabel] = useState(product.category);
  const firstVariant = product.variants[0];
  const firstImage =
    firstVariant?.images[0] ||
    product.images[0] ||
    fallbackProductImage;
  const thumbnails = [
    ...product.variants.flatMap((variant) =>
      variant.images.map((image) => ({
        image,
        variant,
      }))
    ),
    ...product.images.map((image) => ({
      image,
      variant: null,
    })),
  ].filter(
    (thumbnail, index, allThumbnails) =>
      allThumbnails.findIndex(
        (item) => item.image === thumbnail.image
      ) === index
  );

  const [selectedSize, setSelectedSize] = useState(
    getDefaultSize(firstVariant)
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    firstVariant?.color || ""
  );
  const [selectedImage, setSelectedImage] = useState(
    firstImage
  );
  const [purchaseMode, setPurchaseMode] = useState<"unit" | "curve">(
    "unit"
  );
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const retailPrice = getRetailPrice(product);

  const [zoomPosition, setZoomPosition] = useState({
    x: 50,
    y: 50,
  });

  const { addToCart, cart } = useCart();

  useEffect(() => {
    getCategories().then((categories) => {
      setCategoryLabel(
        categories.find(
          (category) => category.value === product.category
        )?.label ?? product.category
      );
    });
  }, [product.category]);

  const selectedVariant =
    product.variants.find(
      (variant) => variant.color === selectedColor
    ) || firstVariant;
  const canBuyCurve = isCurveProduct(product);
  const isCurveSale = canBuyCurve && purchaseMode === "curve";
  const curveStockLimit = canBuyCurve
    ? getCurveStockLimit({
        variant: selectedVariant,
      })
    : 0;
  const curveUnitsPerSet = canBuyCurve
    ? getCurveUnitsPerSet(selectedVariant)
    : 1;
  const curveLabel = canBuyCurve ? getCurveLabel(selectedVariant) : "";
  const curveSizes = getCurveSizesFromVariant(selectedVariant);
  const allProductSizes = sortSizes(
    Array.from(
      new Set(
        product.variants.flatMap((variant) =>
          variant.sizes.map((sizeItem) => sizeItem.size)
        )
      )
    )
  );

  const selectedSizeData =
    selectedVariant?.sizes.find(
      (item) => item.size === selectedSize
    );
  const stockLimit = selectedSizeData?.stock || 0;
  const quantityAlreadyInCart = cart
    .filter(
      (item) =>
        item.id === product.id &&
        item.saleMode === (isCurveSale ? "curve" : "unit") &&
        item.size === (isCurveSale ? curveLabel : selectedSize) &&
        item.selectedColor === selectedColor
    )
    .reduce((total, item) => total + item.quantity, 0);
  const effectiveStockLimit = isCurveSale
    ? curveStockLimit
    : stockLimit;
  const availableToAdd = Math.max(
    effectiveStockLimit - quantityAlreadyInCart,
    0
  );
  const maxQuantityToSelect =
    availableToAdd > 0 ? availableToAdd : 1;
  const selectedQuantity = Math.min(
    Math.max(quantity, 1),
    maxQuantityToSelect
  );
  const resetCartFeedback = () => {
    setCartMessage("");
    setCartError("");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    setCartMessage("");
    setCartError("");

    if (isCurveSale) {
      if (!selectedVariant || curveStockLimit <= 0) {
        setCartError("Este producto no tiene curvas disponibles.");
        return;
      }

      if (availableToAdd <= 0) {
        setCartError(
          "Ya agregaste todo el stock disponible al carrito."
        );
        return;
      }

      addToCart(
        {
          ...product,
          saleMode: "curve",
          selectedImage: selectedImage || fallbackProductImage,
          selectedColor,
        },
        undefined,
        selectedQuantity
      );

      setCartMessage(
        `${selectedQuantity} ${
          selectedQuantity === 1 ? "curva agregada" : "curvas agregadas"
        } al carrito.`
      );
      return;
    }

    if (!selectedVariant || !selectedSizeData) {
      setCartError("Este producto no tiene stock disponible.");
      return;
    }

    if (availableToAdd <= 0) {
      setCartError(
        "Ya agregaste todo el stock disponible al carrito."
      );
      return;
    }

    if (selectedQuantity > availableToAdd) {
      setQuantity(availableToAdd);
      setCartError(
        `Solo quedan ${availableToAdd} disponibles para agregar.`
      );
      return;
    }

    addToCart(
      {
        ...product,
        saleMode: "unit",
        selectedImage: selectedImage || fallbackProductImage,
        selectedColor,
      },
      selectedSize,
      selectedQuantity
    );

    setCartMessage(
      `${selectedQuantity} ${
        selectedQuantity === 1 ? "unidad agregada" : "unidades agregadas"
      } al carrito.`
    );
  };

  return (

    <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/"
            className="rounded-full bg-white px-3 py-1.5 transition hover:text-black"
          >
            Inicio
          </Link>

          <span>/</span>

          <Link
            href={`/tienda?categoria=${product.category}`}
            className="rounded-full bg-white px-3 py-1.5 transition hover:text-black"
          >
            {categoryLabel}
          </Link>

          <span>/</span>

          <span className="rounded-full bg-zinc-200 px-3 py-1.5 text-zinc-700">
            {product.name}
          </span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
          <div
            className="w-full max-w-[700px] overflow-hidden rounded-3xl"
            onMouseMove={(e) => {

              const rect =
                e.currentTarget.getBoundingClientRect();

              const x =
                ((e.clientX - rect.left) / rect.width) * 100;

              const y =
                ((e.clientY - rect.top) / rect.height) * 100;

              setZoomPosition({ x, y });

            }}
          >
            <Image
              src={selectedImage || fallbackProductImage}
              alt={product.name}
              width={700}
              height={800}
              className="aspect-[7/8] w-full object-cover transition-transform duration-300 hover:scale-150"
              style={{
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              }}
            />


          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pt-2">

            {thumbnails.map((thumbnail) => (

              <button
                key={thumbnail.image}
                onClick={() => {
                  resetCartFeedback();
                  setSelectedImage(thumbnail.image);

                  if (thumbnail.variant) {
                    setSelectedColor(thumbnail.variant.color);
                    setSelectedSize(
                      getDefaultSize(thumbnail.variant)
                    );
                  }
                }}
                className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                  selectedImage === thumbnail.image
                    ? "ring-2 ring-black/70 scale-[1.02]"
                    : "opacity-70 hover:opacity-100 hover:scale-[1.02]"
                }`}
              >

                <Image
                  src={thumbnail.image}
                  alt=""
                  width={96}
                  height={128}
                  className="h-28 w-20 object-cover md:h-32 md:w-24"
                />

              </button>

            ))}

          </div>
        </div>
      </div>
      <div className="lg:sticky lg:top-28">

      <h1 className="text-4xl font-bold leading-tight md:text-5xl">
        {product.name}
      </h1>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Precio mayorista
            </p>

            <p className="mt-1 text-4xl font-bold">
              {formatPrice(product.price)}
            </p>
          </div>

          {hasDifferentRetailPrice(product) && (
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Minorista
              </p>
              <p className="mt-1 font-semibold text-zinc-900">
                {formatPrice(retailPrice)}
              </p>
            </div>
          )}
        </div>

        {product.details.length > 0 && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <ul className="list-disc space-y-1.5 pl-5 text-base font-semibold leading-7 text-zinc-700">
              {product.details.map((detail) => (
                <li key={detail}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {(!isCurveSale && (!selectedSizeData ||
        selectedSizeData.stock <= 0) && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600">
            <AlertCircle size={16} />
            Agotado
          </div>
        ))}
      {isCurveSale && curveStockLimit <= 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600">
          <AlertCircle size={16} />
          Agotado
        </div>
      )}
      <div className="mt-6 space-y-5 rounded-3xl bg-white p-5 shadow-sm">
        {canBuyCurve && (
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Modalidad
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  resetCartFeedback();
                  setPurchaseMode("unit");
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  purchaseMode === "unit"
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 bg-zinc-50 hover:border-black"
                }`}
              >
                <span className="block text-sm font-bold">
                  Unidad
                </span>
                <span className="mt-1 block text-xs opacity-75">
                  Elegis talle y cantidad
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetCartFeedback();
                  setPurchaseMode("curve");
                }}
                disabled={curveStockLimit <= 0}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  purchaseMode === "curve"
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 bg-zinc-50 hover:border-black"
                } ${
                  curveStockLimit <= 0
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
              >
                <span className="block text-sm font-bold">
                  Curva
                </span>
                <span className="mt-1 block text-xs opacity-75">
                  1 de cada talle del color
                </span>
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Color
            </p>

            {selectedColor && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {selectedColor}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {product.variants.map((variant) => (
              <button
                key={variant.color}
                type="button"
                title={variant.color}
                aria-label={`Color ${variant.color}`}
                onClick={() => {
                  resetCartFeedback();
                  setSelectedColor(variant.color);
                  setSelectedImage(
                    variant.images[0] ||
                    product.images[0] ||
                    fallbackProductImage
                  );
                  setSelectedSize(
                    getDefaultSize(variant)
                  );
                }}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                  selectedColor === variant.color
                    ? "scale-110 border-black"
                    : "border-zinc-200 hover:border-black"
                }`}
              >
                <span
                  className="h-7 w-7 rounded-full border border-black/10"
                  style={{
                    backgroundColor: variant.hex,
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {isCurveSale ? (
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Venta por curva
              </p>

              {curveStockLimit <= 3 && curveStockLimit > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                  <AlertCircle size={13} />
                  Ultimas curvas
                </span>
              )}
            </div>

            <p className="mt-2 text-lg font-bold">
              {curveLabel}
            </p>

            <p className="mt-1 text-sm leading-5 text-zinc-600">
              1 unidad de cada talle del color. Total: {curveUnitsPerSet} prendas.
            </p>

            <div className="mt-3 grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Precio por unidad
                </p>
                <p className="text-base font-bold text-zinc-900">
                  {formatPrice(product.price)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Precio por curva
                </p>
                <p className="text-base font-bold text-zinc-900">
                  {formatPrice(product.price * curveUnitsPerSet)}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {curveSizes.map((size) => (
                <span
                  key={size}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                >
                  {size}
                </span>
              ))}
            </div>

          </div>
        ) : (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Talle
            </p>

            {selectedSizeData &&
              selectedSizeData.stock > 0 &&
              selectedSizeData.stock <= 5 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                  <AlertCircle size={13} />
                  Ultimas unidades
                </span>
              )}
          </div>

          <div className="flex flex-wrap gap-3">
            {allProductSizes.map((size) => {
              const sizeItem = selectedVariant?.sizes.find(
                (item) => item.size === size
              );
              const isAvailable = Boolean(
                sizeItem && sizeItem.stock > 0
              );
              const isSelected = selectedSize === size;

              return (
                <span
                  key={size}
                  className="group relative inline-flex"
                >
                  <button
                    type="button"
                    title={isAvailable ? `Talle ${size}` : undefined}
                    aria-label={
                      isAvailable ? `Talle ${size}` : `Talle ${size} agotado`
                    }
                    onClick={() => {
                      resetCartFeedback();
                      setSelectedSize(size);
                    }}
                    disabled={!isAvailable}
                    className={`h-11 min-w-11 rounded-xl border px-4 text-sm font-semibold transition ${
                      isAvailable && isSelected
                        ? "border-black bg-black text-white"
                        : "border-zinc-200 bg-zinc-50 hover:border-black"
                    } ${
                      isAvailable
                        ? "cursor-pointer"
                        : "cursor-not-allowed text-zinc-400 line-through opacity-60"
                    }`}
                  >
                    {size}
                  </button>

                  {!isAvailable && (
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                      Agotado
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
        )}

      </div>

      <div className="mt-5 rounded-3xl bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-14 items-center rounded-2xl border border-zinc-200 bg-zinc-50">
            <button
              onClick={() =>
                setQuantity(
                  selectedQuantity > 1
                    ? selectedQuantity - 1
                    : 1
                )
              }
              className="flex h-full w-12 items-center justify-center text-xl transition hover:bg-zinc-100 cursor-pointer"
            >
              -
            </button>

            <input
              type="number"
              min="1"
              max={availableToAdd || 1}
              value={selectedQuantity}
              onChange={(e) => {
                const nextQuantity = Math.floor(
                  Number(e.target.value)
                );
                const maxQuantity =
                  availableToAdd > 0 ? availableToAdd : 1;

                setQuantity(
                  Number.isFinite(nextQuantity)
                    ? Math.min(
                        Math.max(1, nextQuantity),
                        maxQuantity
                      )
                    : 1
                );
              }}
              className="w-14 bg-transparent text-center text-lg font-semibold outline-none"
            />

            <button
              onClick={() =>
                setQuantity(
                  selectedQuantity < availableToAdd
                    ? selectedQuantity + 1
                    : selectedQuantity
                )
              }
              disabled={
                availableToAdd <= 0 ||
                selectedQuantity >= availableToAdd
              }
              className="flex h-full w-12 items-center justify-center text-xl transition hover:bg-zinc-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={
              (!isCurveSale &&
                (!selectedSizeData || selectedSizeData.stock <= 0)) ||
              (isCurveSale && curveStockLimit <= 0) ||
              availableToAdd <= 0
            }
            className={`h-14 flex-1 rounded-2xl font-semibold tracking-wide transition ${
              (!isCurveSale && (!selectedSizeData ||
              selectedSizeData.stock <= 0)) ||
              (isCurveSale && curveStockLimit <= 0) ||
              availableToAdd <= 0
                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-zinc-800 cursor-pointer"
            }`}
          >
            {isCurveSale && curveStockLimit <= 0
              ? "AGOTADO"
              : !isCurveSale && (!selectedSizeData || selectedSizeData.stock <= 0)
              ? "AGOTADO"
              : availableToAdd <= 0
              ? "STOCK EN CARRITO"
              : isCurveSale
              ? "AGREGAR CURVA AL CARRITO"
              : "AGREGAR AL CARRITO"}
          </button>
        </div>
      </div>

          {quantityAlreadyInCart > 0 && availableToAdd > 0 && (
            <div className="mt-3 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
              Ya tenes {quantityAlreadyInCart} en el carrito para este{" "}
              {isCurveSale ? "color y curva" : "talle y color"}.
            </div>
          )}

          {cartError && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0"
              />
              <span>{cartError}</span>
            </div>
          )}

          {cartMessage && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle
                size={16}
                className="mt-0.5 shrink-0"
              />
              <span>{cartMessage}</span>
            </div>
          )}


          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-zinc-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100">
                  <Truck size={18} />
                </span>
                Envios a todo el pais
              </div>

            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <Barcode size={14} />
                SKU {getDisplaySku(product)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <Tag size={14} />
                {categoryLabel}
              </span>
            </div>
          </div>

          </div>

  </div> 
  );
}
