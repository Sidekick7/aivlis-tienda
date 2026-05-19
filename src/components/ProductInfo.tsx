"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import {
  fallbackProductImage,
  getCategoryLabel,
} from "@/config/store";
import { useCart } from "@/context/CartContext";
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

export default function ProductInfo({ product }: Props) {
  const categoryLabel = getCategoryLabel(product.category);
  const firstVariant = product.variants[0];
  const firstImage =
    firstVariant?.images[0] ||
    product.images[0] ||
    fallbackProductImage;
  const thumbnails = [
    ...product.images.map((image) => ({
      image,
      variant: null,
    })),
    ...product.variants.flatMap((variant) =>
      variant.images.map((image) => ({
        image,
        variant,
      }))
    ),
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

  const [zoomPosition, setZoomPosition] = useState({
    x: 50,
    y: 50,
  });

  const { addToCart, cart } = useCart();

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
                ? "ring-2 ring-white/80 scale-[1.02]"
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
      <div className="lg:sticky lg:top-28">

      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">

        <Link
          href="/"
          className="hover:text-white transition"
        >
          Inicio
        </Link>

        <span>/</span>

        <Link
          href={`/category/${product.category}`}
          className="hover:text-white transition"
        >
          {categoryLabel}
        </Link>

        <span>/</span>

        <span className="text-zinc-300">
          {product.name}
        </span>

      </div>

      <h1 className="text-5xl font-bold">
        {product.name}
      </h1>

      <p className="text-3xl mt-5">
        ${product.price}
      </p>
      
      <p className="mt-2 text-zinc-400">
        Precio mayorista
      </p>
      {selectedSizeData &&
        selectedSizeData.stock > 0 &&
        selectedSizeData.stock <= 5 && (

        <p className="mt-4 text-sm text-red-400">
          Últimas unidades disponibles
        </p>

      )}

      {(!selectedSizeData ||
        selectedSizeData.stock <= 0) && (

        <p className="mt-4 text-sm text-zinc-500">
          Agotado
        </p>

      )}
      <p className="mt-8 text-zinc-300 leading-relaxed whitespace-pre-line">
        {product.description}
      </p>

      <div className="mt-8">

        <p className="mb-3 text-zinc-400">
          Talles
        </p>

        <div className="flex gap-3">

          {selectedVariant?.sizes?.map((sizeItem) => (

            <button
              key={sizeItem.size}
              onClick={() => {
                resetCartFeedback();
                setSelectedSize(sizeItem.size);
              }}
              disabled={sizeItem.stock <= 0}
              className={`w-12 h-12 border rounded-xl transition ${
                selectedSize === sizeItem.size
                  ? "bg-white text-black border-white"
                  : "border-zinc-700 hover:border-white"
              } ${
                sizeItem.stock <= 0
                  ? "opacity-40 cursor-not-allowed"
                  : ""
              }`}
            >
              {sizeItem.size}
            </button>

          ))}

        </div>

      </div>

      <div className="mt-8">

        <p className="mb-3 text-zinc-400">
          Colores
        </p>

        <div className="flex gap-3">

          {product.variants.map((variant) => (

            <button
              key={variant.color}
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
              className={`w-8 h-8 rounded-full border-2 transition ${
                selectedColor === variant.color
                  ? "border-white scale-110"
                  : "border-zinc-700 hover:border-white"
              }`}
              style={{
                backgroundColor: variant.hex,
              }}
            />

          ))}

        </div>

      </div>

      <div className="flex items-center gap-4 mt-8">

        <div className="flex items-center border border-zinc-700 rounded-2xl h-14">

          <button
            onClick={() =>
              setQuantity(
                selectedQuantity > 1
                  ? selectedQuantity - 1
                  : 1
              )
            }
            className="w-12 h-full flex items-center justify-center text-xl hover:bg-zinc-900 transition cursor-pointer"
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
            className="w-14 bg-transparent text-center outline-none text-lg font-semibold"
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
            className="w-12 h-full flex items-center justify-center text-xl hover:bg-zinc-900 transition cursor-pointer"
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
          className={`flex-1 h-14 rounded-2xl font-semibold tracking-wide transition ${
            !selectedSizeData ||
            selectedSizeData.stock <= 0 ||
            availableToAdd <= 0
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-white text-black hover:opacity-90 cursor-pointer"
          }`}
        >
          {!selectedSizeData || selectedSizeData.stock <= 0
            ? "AGOTADO"
            : availableToAdd <= 0
            ? "STOCK EN CARRITO"
            : "AGREGAR AL CARRITO"}
        </button>

          </div>         

          {quantityAlreadyInCart > 0 && availableToAdd > 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              Ya tenes {quantityAlreadyInCart} en el carrito para este talle y color.
            </p>
          )}

          {cartError && (
            <p className="mt-3 text-sm text-red-400">
              {cartError}
            </p>
          )}

          {cartMessage && (
            <p className="mt-3 text-sm text-green-400">
              {cartMessage}
            </p>
          )}


          <div className="mt-10 flex flex-col gap-3 text-sm text-zinc-400">

            <p>
              ✓ Envíos a todo el país
            </p>

            {product.details.map((detail) => (
              <p key={detail}>
                ✓ {detail}
              </p>
            ))}

          </div>
          <div className="mt-20 flex flex-col gap-2 text-sm text-zinc-500 uppercase tracking-wide">

            <p>
              SKU · {product.sku ?? product.slug}
            </p>

            <p>
              Categoría · {categoryLabel}
            </p>

          </div>

          </div>

  </div> 
  );
}
