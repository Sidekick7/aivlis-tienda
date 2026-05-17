"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

type Props = {
  product: {
    id: number;
    name: string;
    price: number;
    description: string;
    sku: string;
    variants: {
      color: string;
      hex: string;
      stock: number;
      sizes: string[];
      images: string[];
    }[];
    
    category: string;
    minimum: number;
  };
};

export default function ProductInfo({ product }: Props) {

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    product.variants[0].color
  );
  const [selectedImage, setSelectedImage] = useState(
    product.variants[0].images[0]
  );

  const [zoomPosition, setZoomPosition] = useState({
    x: 50,
    y: 50,
  });

  const { addToCart } = useCart();
  const selectedVariant =
  product.variants.find(
    (variant) => variant.color === selectedColor
  ) || product.variants[0];

  const handleAddToCart = () => {

    if (
      quantity >
      Math.min(selectedVariant.stock, 20)
    ){
      alert("Superaste el stock disponible");
      return;
    }

    addToCart(
      {
        ...product,
        selectedImage,
        selectedColor,
      },
      selectedSize,
      quantity
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
      <img
        src={selectedImage}
        alt={product.name}
        className="w-full max-h-[800px] object-cover transition-transform duration-300 hover:scale-150"
        style={{
          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
        }}
      />


      
    </div>
      <div className="flex flex-col gap-3 pt-2">

        {product.variants.flatMap((variant) =>
          variant.images.map((image) => (

          <button
            key={image}
            onClick={() => {
              setSelectedImage(image);
              setSelectedColor(variant.color);
              setSelectedSize(
                variant.sizes?.[0] || ""
              );
            }}
            className={`rounded-2xl overflow-hidden transition-all duration-300 ${
              selectedImage === image
                ? "ring-2 ring-white/80 scale-[1.02]"
                : "opacity-70 hover:opacity-100 hover:scale-[1.02]"
            }`}
          >

            <img
              src={image}
              alt=""
              className="w-24 h-32 object-cover"
            />

          </button>

        ))
      )}
        

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
          className="hover:text-white transition capitalize"
        >
          {product.category}
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
      {selectedVariant?.stock > 0 &&
        selectedVariant?.stock <= 5 && (

        <p className="mt-4 text-sm text-red-400">
          Últimas unidades disponibles
        </p>

      )}

      {selectedVariant?.stock <= 0 && (

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

          {selectedVariant?.sizes?.map((size: string) => (

            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`w-12 h-12 border rounded-xl transition ${
                selectedSize === size
                  ? "bg-white text-black border-white"
                  : "border-zinc-700 hover:border-white"
              }`}
            >
              {size}
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
                setSelectedColor(variant.color);
                setSelectedImage(variant.images[0]);
                setSelectedSize(
                  variant.sizes?.[0] || ""
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
              setQuantity((prev) =>
                prev > 1 ? prev - 1 : 1
              )
            }
            className="w-12 h-full flex items-center justify-center text-xl hover:bg-zinc-900 transition cursor-pointer"
          >
            -
          </button>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(
                Math.max(1, Number(e.target.value))
              )
            }
            className="w-14 bg-transparent text-center outline-none text-lg font-semibold"
          />

          <button
            onClick={() =>
              setQuantity((prev) =>
                prev <
                Math.min(selectedVariant.stock, 20)
                  ? prev + 1
                  : prev
              )
            }
            className="w-12 h-full flex items-center justify-center text-xl hover:bg-zinc-900 transition cursor-pointer"
          >
            +
          </button>

        </div>

        <button
          onClick={handleAddToCart}
          disabled={selectedVariant.stock <= 0}
          className={`flex-1 h-14 rounded-2xl font-semibold tracking-wide transition ${
            selectedVariant.stock <= 0
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-white text-black hover:opacity-90 cursor-pointer"
          }`}
        >
          {selectedVariant.stock <= 0
            ? "AGOTADO"
            : "AGREGAR AL CARRITO"}
        </button>

          </div>         


          <div className="mt-10 flex flex-col gap-3 text-sm text-zinc-400">

            <p>
              ✓ Compra mínima: {product.minimum} unidades
            </p>

            <p>
              ✓ Envíos a todo el país
            </p>

            <p>
              ✓ Calidad premium
            </p>

          </div>
          <div className="mt-20 flex flex-col gap-2 text-sm text-zinc-500 uppercase tracking-wide">

            <p>
              SKU · {product.sku}
            </p>

            <p>
              Categoría · {product.category}
            </p>

          </div>

          </div>

  </div> 
  );
}