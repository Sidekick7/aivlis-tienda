"use client";

import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import Cart from "@/components/Cart";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

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

  useEffect(() => {

    const interval = setInterval(() => {

      setCurrentImage((prev) =>
        prev === heroImages.length - 1
          ? 0
          : prev + 1
      );

    }, 5000);

    return () => clearInterval(interval);

  }, [heroImages.length]);

  return (
    <main className="min-h-screen bg-black text-white">

      <section className="relative w-full h-screen">

        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          loop
          grabCursor={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
          }}
          className="w-full h-full"
        >

          {heroImages.map((image) => (

            <SwiperSlide key={image}>

              <img
                src={image}
                alt=""
                draggable={false}
                className="w-full h-screen object-cover"
              />

            </SwiperSlide>

          ))}

        </Swiper>

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