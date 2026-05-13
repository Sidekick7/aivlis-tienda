"use client";

import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import Cart from "@/components/Cart";
import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export default function Home() {

  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const heroImages = [
    "/hero/1.png",
    "/hero/2.png",
    "/hero/3.png",
  ];

  const [currentImage, setCurrentImage] = useState(0);

  const addToCart = (product: any) => {

    const existingProduct = cart.find(
      (item) => item.id === product.id
    );

    let updatedCart;

    if (existingProduct) {

      updatedCart = cart.map((item) =>
        item.id === product.id
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
          quantity: 1,
        },
      ];

    }

    setCart(updatedCart);
    setIsCartOpen(true);

  };

  const removeFromCart = (id: number) => {

    const updatedCart = cart
      .map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      )
      .filter((item) => item.quantity > 0);

    setCart(updatedCart);
  };

  useEffect(() => {

    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

  }, []);

  useEffect(() => {

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

  }, [cart]);

  return (
    <main className="min-h-screen bg-black text-white">

      <section className="relative w-full h-screen overflow-hidden">

        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(-${currentImage * 100}vw)`,
          }}
        >

          {heroImages.map((image) => (

            <img
              key={image}
              src={image}
              alt=""
              className="w-screen h-full object-cover flex-shrink-0"
            />

          ))}

        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">

          {heroImages.map((_, index) => (

            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`w-3 h-3 rounded-full transition ${
                currentImage === index
                  ? "bg-white"
                  : "bg-white/40"
              }`}
            />

          ))}

        </div>

      </section>

      <section id="catalogo" className="px-10 py-20">

        <h2 className="text-5xl font-bold mb-10">
          Catálogo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
            />
          ))}

        </div>

      </section>

      {isCartOpen && (
        <Cart
          cart={cart}
          removeFromCart={removeFromCart}
          onClose={() => setIsCartOpen(false)}
        />
      )}

    </main>
  );
}