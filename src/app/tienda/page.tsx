"use client";

import ProductCard from "@/components/ProductCard";
import { getCategories, getFallbackCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import type { StoreCategory } from "@/types/category";
import type { Product } from "@/types/product";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type ShopCategoryFilter = "all" | string;
type ShopSort = "newest" | "price-asc" | "price-desc";

const productSkeletons = Array.from({ length: 8 }, (_, index) => index);

const sortOptions: Array<{
  label: string;
  value: ShopSort;
}> = [
  { label: "Mas nuevos", value: "newest" },
  { label: "Menor precio", value: "price-asc" },
  { label: "Mayor precio", value: "price-desc" },
];

function ProductCardSkeleton() {
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

function ShopPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>(
    getFallbackCategories()
  );
  const [productsError, setProductsError] = useState("");
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<ShopSort>("newest");
  const categoryFilter =
    searchParams.get("categoria") || "all";

  useEffect(() => {
    const fetchShopContent = async () => {
      try {
        const [loadedProducts, loadedCategories] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);

        setProducts(loadedProducts);
        setCategories(loadedCategories);
      } catch {
        setProductsError("No se pudo cargar la tienda.");
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchShopContent();
  }, []);

  const visibleProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "featured") return product.featured;
      return product.category === categoryFilter;
    });

    return [...filteredProducts].sort((a, b) => {
      if (sortBy === "newest") return b.id - a.id;
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;

      return 0;
    });
  }, [categoryFilter, products, sortBy]);

  const updateCategory = (category: ShopCategoryFilter) => {
    const url =
      category === "all"
        ? "/tienda"
        : `/tienda?categoria=${category}`;

    router.replace(url, { scroll: false });
  };

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="px-6 pb-14 pt-6 md:px-10 md:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-5xl font-bold">
                Tienda
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
                Filtra por categoria y ordena los productos para
                encontrar mas rapido lo que estas buscando.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="shop-sort"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Ordenar
              </label>

              <select
                id="shop-sort"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as ShopSort)
                }
                className="h-11 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold outline-none"
              >
                {sortOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="-mx-6 mb-8 flex gap-2 overflow-x-auto px-6 pb-2 md:mx-0 md:mb-10 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            <button
              type="button"
              onClick={() => updateCategory("all")}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                categoryFilter === "all"
                  ? "bg-black text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Todos
            </button>

            <button
              type="button"
              onClick={() => updateCategory("featured")}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                categoryFilter === "featured"
                  ? "bg-black text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Destacados
            </button>

            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => updateCategory(category.value)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                  categoryFilter === category.value
                    ? "bg-black text-white"
                    : "bg-white text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {isProductsLoading &&
              productSkeletons.map((item) => (
                <ProductCardSkeleton key={item} />
              ))}

            {!isProductsLoading && productsError && (
              <div className="col-span-full rounded-lg border border-zinc-200 bg-white p-8 text-center">
                <p className="text-lg font-semibold">
                  No pudimos cargar la tienda.
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  {productsError}
                </p>
              </div>
            )}

            {!isProductsLoading &&
              !productsError &&
              visibleProducts.length === 0 && (
                <div className="col-span-full rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
                  <p className="text-2xl font-bold">
                    No hay productos para este filtro.
                  </p>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
                    Cambia la categoria, limpia el filtro o volve a ver
                    todos los productos disponibles.
                  </p>

                  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {categoryFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => updateCategory("all")}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Ver todos
                    </button>

                    )}
                  </div>
                </div>
              )}

            {!isProductsLoading &&
              visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <main className="home-main-offset min-h-screen bg-zinc-100 text-black" />
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}
