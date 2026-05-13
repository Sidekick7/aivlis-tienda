"use client";

import { useState } from "react";

type Props = {
  product: {
    id: number;
    name: string;
    price: number;
    images: string[];
    sizes: string[];
    description: string;
    minimum: number;
  };
};

export default function ProductInfo({ product }: Props) {

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(
  product.images[0]
);
  const addToCart = () => {

    const cart = JSON.parse(
      localStorage.getItem("cart") || "[]"
    );

    const existingProduct = cart.find(
      (item: any) =>
        item.id === product.id &&
        item.size === selectedSize
    );

    let updatedCart;

    if (existingProduct) {

      updatedCart = cart.map((item: any) =>
        item.id === product.id &&
        item.size === selectedSize
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );

    } else {

      updatedCart = [
        ...cart,
        {
          ...product,
          size: selectedSize,
          quantity: 1,
        },
      ];

    }

    localStorage.setItem(
      "cart",
      JSON.stringify(updatedCart)
    );

    window.dispatchEvent(new Event("cartUpdated"));

  };

  return (
    <div>
      
    <div>

      <img
        src={selectedImage}
        alt={product.name}
        className="w-full rounded-2xl"
      />

      <div className="flex gap-3 mt-4">

        {product.images.map((image) => (

          <button
            key={image}
            onClick={() => setSelectedImage(image)}
            className={`border rounded-xl overflow-hidden ${
              selectedImage === image
                ? "border-white"
                : "border-zinc-700"
            }`}
          >

            <img
              src={image}
              alt=""
              className="w-20 h-20 object-cover"
            />

          </button>

        ))}

      </div>

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

      <p className="mt-6 text-zinc-300 leading-relaxed">
        {product.description}
      </p>

      <div className="mt-8">

        <p className="mb-3 text-zinc-400">
          Talles
        </p>

        <div className="flex gap-3">

          {product.sizes.map((size) => (

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
          Cantidad
        </p>

        <div className="flex items-center gap-4">

          <button
            onClick={() =>
              setQuantity((prev) =>
                prev > 1 ? prev - 1 : 1
              )
            }
            className="w-10 h-10 border border-zinc-700 rounded-xl hover:border-white transition"
          >
            -
          </button>

          <span className="text-xl font-semibold w-8 text-center">
            {quantity}
          </span>

          <button
            onClick={() =>
              setQuantity((prev) => prev + 1)
            }
            className="w-10 h-10 border border-zinc-700 rounded-xl hover:border-white transition"
          >
            +
          </button>

          <button
            onClick={addToCart}
            className="w-full mt-10 bg-white text-black py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition"
            >
            Agregar
            {selectedSize && ` - Talle ${selectedSize}`}
            {quantity > 1 && ` (${quantity})`}
          </button>
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

        </div>

      </div>

    </div>
  );
}