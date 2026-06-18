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
      <section className="px-6 pb-14 pt-4 md:px-10 md:pt-5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                Tienda
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Filtro
                </span>

                <div className="flex h-11 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCategory("all")}
                    className={`h-11 rounded-full px-4 text-sm font-semibold transition ${
                      categoryFilter === "all"
                        ? "bg-black text-white"
                        : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    Todos
                  </button>

                  <button
                    type="button"
                    onClick={() => updateCategory("featured")}
                    className={`h-11 rounded-full px-4 text-sm font-semibold transition ${
                      categoryFilter === "featured"
                        ? "bg-black text-white"
                        : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    Destacados
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="shop-category"
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Categoria
                </label>

                <select
                  id="shop-category"
                  value={categoryFilter}
                  onChange={(event) =>
                    updateCategory(event.target.value)
                  }
                  className="h-11 min-w-48 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold outline-none"
                >
                  <option value="all">Categorias</option>
                  {categories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
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
                  className="h-11 min-w-44 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold outline-none"
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
