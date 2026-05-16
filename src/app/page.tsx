"use client";

import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import { useEffect, useRef, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useCart } from "@/context/CartContext";
import { Swiper as SwiperType } from "swiper";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export default function Home() {
  const { addToCart } = useCart();



  const editorialImages = [
    "/editorial/1.png",
    "/editorial/2.png",
    "/editorial/3.png",
    "/editorial/4.png",
    "/editorial/5.png",
  ];

  const [currentImage, setCurrentImage] = useState(0);
  const swiperRef = useRef<any>(null);
  
  useEffect(() => {

    const interval = setInterval(() => {

      setCurrentImage((prev) =>
        prev === editorialImages.length - 1
          ? 0
          : prev + 1
      );

    }, 5000);

    return () => clearInterval(interval);

  }, [editorialImages.length]);

  return (
    <main className="min-h-screen bg-zinc-100 text-black pt-21">

      <section className="relative w-full h-[92vh] overflow-visible">

        <Swiper
          style={{ overflow: "visible" }}
          ref={swiperRef}
          onSlideChange={(swiper) =>
            setCurrentImage(swiper.realIndex)
          }
          modules={[Autoplay]}
          spaceBetween={0}
          slidesPerView={3}
          breakpoints={{
            0: {
              slidesPerView: 1,
            },
            768: {
              slidesPerView: 2,
            },
            1200: {
              slidesPerView: 3,
            },
          }}
          loop
          grabCursor={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          
          className="w-full h-[85vh] pointer-events-auto"
        >

          {editorialImages.map((image) => (

            <SwiperSlide 
              key={image}
              className="overflow-hidden"
              >
              

              <img
                src={image}
                alt=""
                draggable={false}
                className="w-full h-full object-cover object-center transition duration-700 hover:scale-105"
              />

            </SwiperSlide>

          ))}

        </Swiper>
        <div className="relative z-50 flex justify-center gap-3 mt-6 pointer-events-auto">

          {editorialImages.map((_, index) => (

            <button
              key={index}
              onClick={() =>
                swiperRef.current?.swiper.slideToLoop(index)
              }
              className={`
                w-3 h-3 rounded-full cursor-pointer transition-all
                ${
                  currentImage === index
                    ? "bg-black scale-125"
                    : "bg-zinc-400"
                }
              `}
            />

          ))}

        </div>

      </section>
      
      <section id="catalogo" className="px-10 py-20">

        <h2 className="text-5xl font-bold mb-10">
          Catálogo
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">

          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
            />
          ))}

        </div>

      </section>

    

    </main>
  );
}