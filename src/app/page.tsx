"use client";

import ProductCard from "@/components/ProductCard";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import type { SwiperRef } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { editorialImages } from "@/config/store";
import { getProducts } from "@/lib/products";
import type { Product } from "@/types/product";


export default function Home() {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState("");
    useEffect(() => {

    const fetchProducts = async () => {
      try {
        const products = await getProducts();

        setDbProducts(products);
      } catch {
        setProductsError("No se pudo cargar el catálogo.");
      }

    };

    fetchProducts();

  }, []);

  const [currentImage, setCurrentImage] = useState(0);
  const swiperRef = useRef<SwiperRef>(null);
  
  useEffect(() => {

    const interval = setInterval(() => {

      setCurrentImage((prev) =>
        prev === editorialImages.length - 1
          ? 0
          : prev + 1
      );

    }, 5000);

    return () => clearInterval(interval);

  }, []);

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
              

              <Image
                src={image}
                alt=""
                width={900}
                height={1100}
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
          {productsError && (
            <p className="col-span-full text-zinc-500">
              {productsError}
            </p>
          )}

          {[...dbProducts]
            .sort((a, b) =>
              Number(b.featured) - Number(a.featured)
            )
            .map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
           ))}

        </div>

      </section>

    

    </main>
  );
}
