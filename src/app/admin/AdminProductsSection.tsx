"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  currencyFormatter,
  getProductImage,
  getProductTotalStock,
} from "@/app/admin/adminUtils";
import { getRetailPrice } from "@/lib/pricing";
import type { ProductFilter } from "@/app/admin/adminTypes";
import type { StoreCategory } from "@/types/category";
import type { Product } from "@/types/product";

const PRODUCTS_PER_PAGE = 12;

type Props = {
  products: Product[];
  categories: StoreCategory[];
  savingProductAction: {
    id: number;
    action: "featured" | "active" | "delete";
  } | null;
  onToggleFeatured: (product: Product) => Promise<void>;
  onToggleActive: (product: Product) => Promise<void>;
  onDelete: (productId: number) => Promise<void>;
  onEdit: (product: Product) => void;
  onCreateProduct: () => void;
};

export default function AdminProductsSection({
  products,
  categories,
  savingProductAction,
  onToggleFeatured,
  onToggleActive,
  onDelete,
  onEdit,
  onCreateProduct,
}: Props) {
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] =
    useState<ProductFilter>("all");
  const [productCategoryFilter, setProductCategoryFilter] =
    useState("all");
  const [productPage, setProductPage] = useState(1);
  const getCategoryLabel = (categoryValue: string) =>
    categories.find(
      (categoryOption) => categoryOption.value === categoryValue
    )?.label ?? categoryValue;

  const normalizedProductSearch = productSearch
    .trim()
    .toLowerCase();
  const searchedProducts = normalizedProductSearch
    ? products.filter((product) =>
        [
          product.name,
          product.slug,
          product.category,
          product.sku ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedProductSearch)
      )
    : products;
  const visibleProducts = searchedProducts.filter((product) => {
    const totalStock = getProductTotalStock(product);
    const matchesCategory =
      productCategoryFilter === "all" ||
      product.category === productCategoryFilter;

    if (!matchesCategory) return false;
    if (productFilter === "active") return product.active;
    if (productFilter === "inactive") return !product.active;
    if (productFilter === "featured") return product.featured;
    if (productFilter === "in_stock") return totalStock > 0;
    if (productFilter === "out_of_stock") return totalStock <= 0;

    return true;
  });
  const totalProductPages = Math.max(
    1,
    Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE)
  );
  const currentProductPage = Math.min(
    productPage,
    totalProductPages
  );
  const paginatedProducts = visibleProducts.slice(
    (currentProductPage - 1) * PRODUCTS_PER_PAGE,
    currentProductPage * PRODUCTS_PER_PAGE
  );

  return (
    <div className="mt-10 bg-zinc-900 rounded-3xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">
            Productos
          </h2>

          <p className="text-zinc-400 mt-2">
            {visibleProducts.length} de {products.length} productos
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
          <div className="relative w-full lg:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              type="search"
              placeholder="Buscar por nombre, slug, categoria o SKU"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setProductPage(1);
              }}
              className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 outline-none transition focus:border-zinc-500"
            />
          </div>

          <button
            type="button"
            onClick={onCreateProduct}
            className="h-12 rounded-xl bg-white px-5 font-semibold text-black transition hover:opacity-90 cursor-pointer"
          >
            Nuevo producto
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["all", "Todos"],
          ["active", "Publicados"],
          ["inactive", "Ocultos"],
          ["featured", "Destacados"],
          ["in_stock", "Con stock"],
          ["out_of_stock", "Sin stock"],
        ] as [ProductFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setProductFilter(value);
              setProductPage(1);

              if (value === "all") {
                setProductCategoryFilter("all");
                setProductSearch("");
              }
            }}
            className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
              productFilter === value &&
              (value !== "all" || productCategoryFilter === "all")
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}

        {categories.map((categoryOption) => (
          <button
            key={categoryOption.value}
            type="button"
            onClick={() => {
              setProductCategoryFilter(categoryOption.value);
              setProductFilter("all");
              setProductPage(1);
            }}
            className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
              productCategoryFilter === categoryOption.value
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            {categoryOption.label}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
          No hay productos que coincidan con la busqueda.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {paginatedProducts.map((product) => {
          const isSavingProduct =
            savingProductAction?.id === product.id;
          const totalStock = getProductTotalStock(product);

          return (
            <div
              key={product.id}
              className="grid gap-3 rounded-2xl bg-zinc-800 p-3 xl:grid-cols-[minmax(340px,1fr)_260px] xl:items-center"
            >
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src={getProductImage(product)}
                alt={product.name}
                width={60}
                height={60}
                className="h-[60px] w-[60px] shrink-0 rounded-xl object-cover bg-zinc-900"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="max-w-full truncate text-lg font-semibold">
                    {product.name}
                  </h3>

                  <button
                    type="button"
                    onClick={() => onToggleActive(product)}
                    disabled={isSavingProduct}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    product.active
                      ? "bg-green-500/15 text-green-200"
                      : "bg-zinc-700 text-zinc-300"
                  }`}>
                    {isSavingProduct &&
                    savingProductAction.action === "active"
                      ? "Guardando..."
                      : product.active
                        ? "Publicado"
                        : "Oculto"}
                  </button>
                </div>

                <p className="mt-1 truncate text-xs text-zinc-500">
                  /product/{product.slug}
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {product.sku && (
                    <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                      {product.sku}
                    </span>
                  )}

                  <span className="rounded-lg bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-100">
                    Mayorista {currencyFormatter.format(product.price)}
                  </span>

                  <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-zinc-200">
                    Minorista {currencyFormatter.format(getRetailPrice(product))}
                  </span>

                  <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-zinc-200">
                    Stock {totalStock}
                  </span>

                  <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-zinc-200">
                    {getCategoryLabel(product.category)}
                  </span>

                  <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-zinc-300">
                    {product.variants.length} colores
                  </span>
                </div>
              </div>
            </div>

            <div className="grid w-fit grid-cols-2 gap-2 xl:ml-auto">
              <button
                onClick={() => onEdit(product)}
                disabled={isSavingProduct}
                className="h-10 min-w-28 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Editar
              </button>

                <button
                  onClick={() => onToggleFeatured(product)}
                  disabled={isSavingProduct}
                  className={`h-10 min-w-28 rounded-lg px-4 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    product.featured
                      ? "bg-white text-black"
                      : "bg-zinc-700 text-white"
                  }`}
                >
                  {isSavingProduct &&
                  savingProductAction.action === "featured"
                    ? "Guardando..."
                    : product.featured
                      ? "Destacado"
                      : "Normal"}
                </button>

              <button
                onClick={() => onDelete(product.id)}
                disabled={isSavingProduct}
                className="col-span-2 h-10 min-w-28 justify-self-end rounded-lg border border-red-500/30 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProduct &&
                savingProductAction.action === "delete"
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {visibleProducts.length > PRODUCTS_PER_PAGE && (
        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            Pagina {currentProductPage} de {totalProductPages} - Mostrando{" "}
            {paginatedProducts.length} de {visibleProducts.length}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setProductPage((currentPage) =>
                  Math.max(1, currentPage - 1)
                )
              }
              disabled={currentProductPage === 1}
              className="h-10 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>

            <button
              type="button"
              onClick={() =>
                setProductPage((currentPage) =>
                  Math.min(totalProductPages, currentPage + 1)
                )
              }
              disabled={currentProductPage === totalProductPages}
              className="h-10 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
