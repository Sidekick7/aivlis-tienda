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
import {
  getPublicProducts,
  withCurveCategory,
} from "@/lib/publicProducts";
import { getProductImage } from "@/lib/productDisplay";
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
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [homeCategories, setHomeCategories] = useState<StoreCategory[]>(
    getFallbackCategories()
  );
  const [productsError, setProductsError] = useState("");
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isHomeContentLoading, setIsHomeContentLoading] =
    useState(true);
  const swiperRef = useRef<SwiperRef>(null);
  const productPreviewRef = useRef<SwiperRef>(null);

  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const [products, categories, content] = await Promise.all([
          getPublicProducts(),
          getCategories(),
          getHomeContent(),
        ]);

        setPreviewProducts(getHomePreviewProducts(products));
        setCatalogProducts(products);
        setHomeCategories(withCurveCategory(categories, products));
        setHomeContent(content);
      } catch {
        setProductsError("No se pudo cargar la seleccion de productos.");
      } finally {
        setIsProductsLoading(false);
        setIsHomeContentLoading(false);
      }
    };

    fetchHomeContent();
  }, []);

  const visualCategories = homeCategories
    .filter((category) => category.active && category.value !== "curvas")
    .slice(0, 4)
    .map((category) => {
      const categoryProduct = catalogProducts
        .filter((product) => product.category === category.value)
        .sort(
          (firstProduct, secondProduct) =>
            Number(secondProduct.featured) - Number(firstProduct.featured) ||
            secondProduct.id - firstProduct.id
        )[0];

      return {
        ...category,
        image:
          homeContent.categoryImages[category.value] ||
          (categoryProduct ? getProductImage(categoryProduct) : null),
      };
    });

  return (
    <main className="home-main-offset min-h-screen overflow-x-hidden bg-zinc-100 text-black">
      <section className="relative h-[clamp(500px,65vh,680px)] w-full overflow-hidden max-[640px]:h-[clamp(430px,60vh,540px)]">
        {isHomeContentLoading ? (
          <div className="h-full w-full animate-pulse bg-zinc-200" />
        ) : (
          <>
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
              className="h-full w-full pointer-events-auto"
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

            <div className="pointer-events-none absolute inset-0 z-10">
              <div className="pointer-events-auto absolute bottom-16 left-6 max-w-[520px] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] sm:left-10 md:bottom-20 md:left-14">
                <p className="font-brand text-sm uppercase tracking-[0.08em] sm:text-base">
                  Venta mayorista
                </p>
                <h1 className="font-brand mt-1 text-4xl uppercase leading-none sm:text-5xl md:text-6xl">
                  Nuevos ingresos
                </h1>
                <Link
                  href="/tienda"
                  className="font-brand mt-5 inline-flex h-11 items-center justify-center border border-white bg-black px-6 text-sm uppercase text-white transition hover:bg-white hover:text-black"
                >
                  {homeContent.storeButtonLabel}
                </Link>
              </div>
            </div>

            <div className="pointer-events-auto absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 justify-center gap-3">
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
          </>
        )}
      </section>

      <section className="px-6 pb-12 pt-9 md:px-10 md:pt-11">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-end justify-between gap-6">
            <div>
              <h2 className="font-brand text-4xl md:text-5xl">
                {homeContent.featuredTitle}
              </h2>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() =>
                  productPreviewRef.current?.swiper.slidePrev()
                }
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-black transition hover:bg-zinc-200"
                aria-label="Ver producto anterior"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                type="button"
                onClick={() =>
                  productPreviewRef.current?.swiper.slideNext()
                }
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-black transition hover:bg-zinc-200"
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
                spaceBetween={14}
                slidesPerView={2}
                rewind
                grabCursor
                breakpoints={{
                  768: {
                    slidesPerView: 3,
                  },
                  1024: {
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
                      key={product.slug}
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

      <section className="px-6 pb-14 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5">
            <h2 className="font-brand text-4xl md:text-5xl">
              {homeContent.categoryTitle}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {visualCategories.map((category) => (
              <Link
                key={category.value}
                href={`/tienda?categoria=${category.value}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-900"
              >
                {category.image && (
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="(max-width: 1023px) 50vw, 25vw"
                    className="object-cover object-center transition duration-500 group-hover:scale-105"
                  />
                )}

                <div className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-4 text-white sm:px-5">
                  <p className="font-brand text-2xl uppercase sm:text-3xl">
                    {category.label}
                  </p>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300 transition group-hover:text-white">
                    Ver productos
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
