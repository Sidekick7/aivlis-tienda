"use client";

import ProductCard from "@/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { SwiperRef } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { getCategories, getFallbackCategories } from "@/lib/categories";
import {
  fallbackHomeContent,
  getHomeContent,
} from "@/lib/homeContent";
import { getProducts } from "@/lib/products";
import type { StoreCategory } from "@/types/category";
import type { HomeContent } from "@/types/homeContent";
import type { Product } from "@/types/product";

const productSkeletons = Array.from({ length: 6 }, (_, index) => index);

function ProductPreviewSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white">
      <div className="h-[420px] w-full animate-pulse bg-zinc-200 sm:h-[480px] lg:h-[520px]" />

      <div className="flex min-h-[170px] flex-1 flex-col p-5">
        <div className="h-7 w-3/4 animate-pulse rounded bg-zinc-200" />
        <div className="mt-4 h-5 w-20 animate-pulse rounded bg-zinc-200" />
        <div className="mt-4 h-4 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="mt-4 h-8 w-40 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  );
}

function getHomePreviewProducts(products: Product[]) {
  const featuredProducts = products
    .filter((product) => product.featured)
    .sort((a, b) => b.id - a.id);
  const latestProducts = products
    .filter((product) => !product.featured)
    .sort((a, b) => b.id - a.id);

  return [...featuredProducts, ...latestProducts].slice(0, 6);
}

export default function Home() {
  const [currentImage, setCurrentImage] = useState(0);
  const [homeContent, setHomeContent] =
    useState<HomeContent>(fallbackHomeContent);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [homeCategories, setHomeCategories] = useState<StoreCategory[]>(
    getFallbackCategories()
  );
  const [productsError, setProductsError] = useState("");
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const swiperRef = useRef<SwiperRef>(null);
  const productPreviewRef = useRef<SwiperRef>(null);

  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const [products, categories, content] = await Promise.all([
          getProducts(),
          getCategories(),
          getHomeContent(),
        ]);

        setPreviewProducts(getHomePreviewProducts(products));
        setHomeCategories(categories);
        setHomeContent(content);
      } catch {
        setProductsError("No se pudo cargar la seleccion de productos.");
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchHomeContent();
  }, []);

  return (
    <main className="home-main-offset min-h-screen overflow-x-hidden bg-zinc-100 text-black">
      <section className="relative h-[clamp(520px,70vh,760px)] w-full overflow-hidden max-[640px]:h-[clamp(430px,62vh,560px)]">
        <Swiper
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
          grabCursor
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          className="h-[calc(100%-44px)] w-full pointer-events-auto"
        >
          {homeContent.heroImages.map((image) => (
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
                className="hero-slide-image h-full w-full object-cover object-center transition duration-700 hover:scale-105"
              />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="relative mt-3 flex justify-center gap-3 pointer-events-auto">
          {homeContent.heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                swiperRef.current?.swiper.slideToLoop(index)
              }
              className={`h-3 w-3 cursor-pointer rounded-full transition-all ${
                currentImage === index
                  ? "scale-125 bg-black"
                  : "bg-zinc-400"
              }`}
              aria-label={`Ver imagen ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="px-6 pb-1 pt-2 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 border-y border-zinc-200 py-2">
          {homeContent.trustItems.map((item) => (
            <p
              key={item}
              className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
          <h1 className="text-5xl font-bold md:text-6xl">
            {homeContent.storeTitle}
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 md:text-base">
            {homeContent.storeDescription}
          </p>

          <Link
            href="/tienda"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-800"
          >
            {homeContent.storeButtonLabel}
          </Link>
        </div>
      </section>

      <section className="px-6 pb-14 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {homeContent.featuredEyebrow}
              </p>

              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                {homeContent.featuredTitle}
              </h2>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() =>
                  productPreviewRef.current?.swiper.slidePrev()
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-black transition hover:bg-zinc-200"
                aria-label="Ver producto anterior"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                type="button"
                onClick={() =>
                  productPreviewRef.current?.swiper.slideNext()
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-black transition hover:bg-zinc-200"
                aria-label="Ver producto siguiente"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>

          {productsError && (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">
                {productsError}
              </p>
            </div>
          )}

          {!productsError && (
            <div className="relative">
              <Swiper
                ref={productPreviewRef}
                spaceBetween={24}
                slidesPerView={2}
                rewind
                grabCursor
                breakpoints={{
                  768: {
                    slidesPerView: 3,
                  },
                  1280: {
                    slidesPerView: 4,
                  },
                }}
                className="w-full"
              >
                {isProductsLoading &&
                  productSkeletons.map((item) => (
                    <SwiperSlide
                      key={item}
                      className="h-auto"
                    >
                      <ProductPreviewSkeleton />
                    </SwiperSlide>
                  ))}

                {!isProductsLoading &&
                  previewProducts.map((product) => (
                    <SwiperSlide
                      key={product.id}
                      className="h-auto"
                    >
                      <ProductCard product={product} />
                    </SwiperSlide>
                  ))}
              </Swiper>

              <button
                type="button"
                onClick={() =>
                  productPreviewRef.current?.swiper.slidePrev()
                }
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition hover:bg-white sm:hidden"
                aria-label="Ver producto anterior"
              >
                <ChevronLeft size={21} />
              </button>

              <button
                type="button"
                onClick={() =>
                  productPreviewRef.current?.swiper.slideNext()
                }
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition hover:bg-white sm:hidden"
                aria-label="Ver producto siguiente"
              >
                <ChevronRight size={21} />
              </button>
            </div>
          )}

          {!isProductsLoading &&
            !productsError &&
            previewProducts.length === 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
                <p className="text-sm text-zinc-500">
                  Cuando cargues productos desde admin, van a aparecer
                  aca.
                </p>
              </div>
            )}
        </div>
      </section>

      <section className="px-6 pb-20 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {homeContent.categoryEyebrow}
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {homeContent.categoryTitle}
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {homeCategories.map((category) => (
              <Link
                key={category.value}
                href={`/tienda?categoria=${category.value}`}
                className="group flex min-h-24 items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4 transition hover:border-zinc-400"
              >
                <div>
                  <p className="text-xl font-bold">
                    {category.label}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {homeContent.categoryCardText}
                  </p>
                </div>

                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500 transition group-hover:text-black">
                  Entrar
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
