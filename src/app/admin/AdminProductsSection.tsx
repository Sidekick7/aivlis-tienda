"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useState } from "react";
import { categories, getCategoryLabel } from "@/config/store";
import {
  currencyFormatter,
  getProductImage,
  getProductTotalStock,
} from "@/app/admin/adminUtils";
import type { ProductFilter } from "@/app/admin/adminTypes";
import type { Product } from "@/types/product";

type Props = {
  products: Product[];
  savingProductAction: {
    id: number;
    action: "featured" | "delete";
  } | null;
  onToggleFeatured: (product: Product) => Promise<void>;
  onDelete: (productId: number) => Promise<void>;
  onEdit: (product: Product) => void;
};

export default function AdminProductsSection({
  products,
  savingProductAction,
  onToggleFeatured,
  onDelete,
  onEdit,
}: Props) {
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] =
    useState<ProductFilter>("all");
  const [productCategoryFilter, setProductCategoryFilter] =
    useState("all");

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
    if (productFilter === "featured") return product.featured;
    if (productFilter === "in_stock") return totalStock > 0;
    if (productFilter === "out_of_stock") return totalStock <= 0;

    return true;
  });

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

        <div className="relative w-full lg:max-w-sm">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          />

          <input
            type="search"
            placeholder="Buscar por nombre, slug, categoría o SKU"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 outline-none transition focus:border-zinc-500"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["all", "Todos"],
          ["featured", "Destacados"],
          ["in_stock", "Con stock"],
          ["out_of_stock", "Sin stock"],
        ] as [ProductFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setProductFilter(value);

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
          No hay productos que coincidan con la búsqueda.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {visibleProducts.map((product) => {
          const isSavingProduct =
            savingProductAction?.id === product.id;

          return (
            <div
              key={product.id}
              className="grid gap-4 rounded-2xl bg-zinc-800 p-4 lg:grid-cols-[minmax(260px,1fr)_130px_120px_130px_220px] lg:items-center"
            >
            <div className="flex items-center gap-4 min-w-0">
              <Image
                src={getProductImage(product)}
                alt={product.name}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-xl object-cover bg-zinc-900"
              />

              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold">
                  {product.name}
                </h3>

                <p className="mt-1 truncate text-sm text-zinc-500">
                  /product/{product.slug}
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  {product.variants.length} colores
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-zinc-500">
                Precio
              </p>

              <p className="mt-1 font-semibold">
                {currencyFormatter.format(product.price)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-zinc-500">
                Stock
              </p>

              <p className="mt-1 font-semibold">
                {getProductTotalStock(product)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-zinc-500">
                Categoria
              </p>

              <p className="mt-1 capitalize text-zinc-300">
                {getCategoryLabel(product.category)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <button
                onClick={() => onToggleFeatured(product)}
                disabled={isSavingProduct}
                className={`px-4 h-10 rounded-xl font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
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
                    : "No destacado"}
              </button>

              <button
                onClick={() => onDelete(product.id)}
                disabled={isSavingProduct}
                className="text-red-500 hover:text-red-400 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProduct &&
                savingProductAction.action === "delete"
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>

              <button
                onClick={() => onEdit(product)}
                disabled={isSavingProduct}
                className="text-blue-500 hover:text-blue-400 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Editar
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
