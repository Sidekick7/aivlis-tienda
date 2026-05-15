"use client";

import { useState } from "react";

type Props = {
  product: {
    id: number;
    name: string;
    price: number;
    images: string[];
    sizes: string[];
    details: string[];
    sku: string;
    colors: string[];
    category: string;
    minimum: number;
  };
};

export default function ProductInfo({ product }: Props) {

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
  product.colors[0]
  );
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

    <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-16 items-start">
      
    <div className="flex gap-5 items-start">
      <div className="w-full max-w-[700px]">
      <img
        src={selectedImage}
        alt={product.name}
        className="w-full max-h-[800px] object-cover rounded-3xl"
      />


      
    </div>
      <div className="flex flex-col gap-3 pt-2">

        {product.images.map((image) => (

          <button
            key={image}
            onClick={() => setSelectedImage(image)}
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

        ))}

      </div>    
  </div>
      <div className="lg:sticky lg:top-28">
      <h1 className="text-5xl font-bold">
        {product.name}
      </h1>

      <p className="text-3xl mt-5">
        ${product.price}
      </p>
      
      <p className="mt-2 text-zinc-400">
        Precio mayorista
      </p>

      <div className="mt-8 flex flex-col gap-3 text-zinc-300 leading-relaxed">

        {product.details.map((detail) => (

          <p key={detail}>
            • {detail}
          </p>

        ))}

      </div>

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
          Colores
        </p>

        <div className="flex gap-3">

          {product.colors.map((color) => (

            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition ${
                selectedColor === color
                  ? "border-white scale-110"
                  : "border-zinc-700 hover:border-white"
              }`}
              style={{
                backgroundColor: color.toLowerCase(),
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
            className="w-12 h-full flex items-center justify-center text-xl hover:bg-zinc-900 transition"
          >
            -
          </button>

          <span className="w-10 flex items-center justify-center text-lg font-semibold">
            {quantity}
          </span>

          <button
            onClick={() =>
              setQuantity((prev) => prev + 1)
            }
            className="w-12 h-full flex items-center justify-center text-xl hover:bg-zinc-900 transition"
          >
            +
          </button>

        </div>

        <button
          onClick={addToCart}
          className="flex-1 h-14 bg-white text-black rounded-2xl font-semibold tracking-wide hover:opacity-90 transition"
        >
          AGREGAR AL CARRITO
        </button>

      </div>

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
          <div className="mt-10 flex flex-col gap-2 text-sm text-zinc-500 uppercase tracking-wide">

            <p>
              SKU · {product.sku}
            </p>

            <p>
              Categoría · {product.category}
            </p>

          </div>

          </div>

    
  );
}