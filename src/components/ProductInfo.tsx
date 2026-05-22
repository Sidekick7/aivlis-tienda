"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Barcode,
  Check,
  CheckCircle,
  Tag,
  Truck,
} from "lucide-react";
import { fallbackProductImage } from "@/config/store";
import { useCart } from "@/context/CartContext";
import { getCategories } from "@/lib/categories";
import {
  formatPrice,
  getRetailPrice,
  hasDifferentRetailPrice,
  wholesaleMinimum,
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

  const selectedSizeData =
    selectedVariant?.sizes.find(
      (item) => item.size === selectedSize
    );
  const stockLimit = selectedSizeData?.stock || 0;
  const quantityAlreadyInCart = cart
    .filter(
      (item) =>
        item.id === product.id &&
        item.size === selectedSize &&
        item.selectedColor === selectedColor
    )
    .reduce((total, item) => total + item.quantity, 0);
  const availableToAdd = Math.max(
    stockLimit - quantityAlreadyInCart,
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

    <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-16 items-start">
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

        <div className="flex gap-5 items-start">
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
              className="w-full max-h-[800px] object-cover transition-transform duration-300 hover:scale-150"
              style={{
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              }}
            />


          </div>
          <div className="flex flex-col gap-3 pt-2">

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
                  className="w-24 h-32 object-cover"
                />

              </button>

            ))}

          </div>
        </div>
      </div>
      <div className="lg:sticky lg:top-28">

      <h1 className="text-5xl font-bold">
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

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <p>
            Mayorista desde {formatPrice(wholesaleMinimum)} en el carrito.
          </p>

          <p className="mt-1">
            Si el pedido no llega al minimo, se aplica precio minorista.
          </p>
        </div>
      </div>
      {selectedSizeData &&
        selectedSizeData.stock > 0 &&
        selectedSizeData.stock <= 5 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            <AlertCircle size={16} />
            Ultimas unidades disponibles
          </div>
        )}

      {(!selectedSizeData ||
        selectedSizeData.stock <= 0) && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600">
            <AlertCircle size={16} />
            Agotado
          </div>
        )}
      <p className="mt-6 text-zinc-700 leading-relaxed whitespace-pre-line">
        {product.description}
      </p>

      <div className="mt-6 space-y-5 rounded-3xl bg-white p-5 shadow-sm">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Talle
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {selectedVariant?.sizes?.map((sizeItem) => (
              <button
                key={sizeItem.size}
                type="button"
                onClick={() => {
                  resetCartFeedback();
                  setSelectedSize(sizeItem.size);
                }}
                disabled={sizeItem.stock <= 0}
                className={`h-11 min-w-11 rounded-xl border px-4 text-sm font-semibold transition ${
                  selectedSize === sizeItem.size
                    ? "bg-black text-white border-black"
                    : "border-zinc-200 bg-zinc-50 hover:border-black"
                } ${
                  sizeItem.stock <= 0
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {sizeItem.size}
              </button>
            ))}
          </div>
        </div>

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
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition cursor-pointer ${
                  selectedColor === variant.color
                    ? "border-black scale-110"
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
              !selectedSizeData ||
              selectedSizeData.stock <= 0 ||
              availableToAdd <= 0
            }
            className={`h-14 flex-1 rounded-2xl font-semibold tracking-wide transition ${
              !selectedSizeData ||
              selectedSizeData.stock <= 0 ||
              availableToAdd <= 0
                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-zinc-800 cursor-pointer"
            }`}
          >
            {!selectedSizeData || selectedSizeData.stock <= 0
              ? "AGOTADO"
              : availableToAdd <= 0
              ? "STOCK EN CARRITO"
              : "AGREGAR AL CARRITO"}
          </button>
        </div>
      </div>

          {quantityAlreadyInCart > 0 && availableToAdd > 0 && (
            <div className="mt-3 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
              Ya tenes {quantityAlreadyInCart} en el carrito para este talle y color.
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

              {product.details.length > 0 && (
                <div className="mt-4 grid gap-2 text-sm text-zinc-600">
                  {product.details.map((detail) => (
                    <p
                      key={detail}
                      className="flex items-start gap-2"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-zinc-900"
                      />
                      <span>{detail}</span>
                    </p>
                  ))}
                </div>
              )}
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
