"use client";

import Image from "next/image";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
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

type ProductSort =
  | "recent"
  | "oldest"
  | "name_asc"
  | "stock_asc"
  | "stock_desc"
  | "price_asc"
  | "price_desc";

type Props = {
  products: Product[];
  categories: StoreCategory[];
  savingProductAction: {
    id: number;
    action: "featured" | "active" | "delete";
  } | null;
  onToggleFeatured: (product: Product) => Promise<void>;
  onToggleActive: (product: Product) => Promise<void>;
  onDelete: (product: Product) => Promise<void>;
  onEdit: (product: Product) => void;
  onCreateProduct: () => void;
};

function getSkuParts(sku?: string | null) {
  if (!sku) return null;

  if (!sku.startsWith("AIV-")) {
    return {
      prefix: "",
      code: sku,
    };
  }

  return {
    prefix: "AIV",
    code: sku.slice(4),
  };
}

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
  const [productSort, setProductSort] =
    useState<ProductSort>("recent");
  const [productPage, setProductPage] = useState(1);
  const [openProductMenuId, setOpenProductMenuId] =
    useState<number | null>(null);
  const [expandedStockProductId, setExpandedStockProductId] =
    useState<number | null>(null);

  useEffect(() => {
    if (openProductMenuId === null) return;

    const closeMenu = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest("[data-product-menu]")
      ) {
        setOpenProductMenuId(null);
      }
    };

    document.addEventListener("mousedown", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, [openProductMenuId]);
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
  const filteredProducts = searchedProducts.filter((product) => {
    const totalStock = getProductTotalStock(product);
    const hasLowStock = product.variants.some((variant) =>
      variant.sizes.some((size) => size.stock > 0 && size.stock <= 3)
    );
    const matchesCategory =
      productCategoryFilter === "all" ||
      product.category === productCategoryFilter;

    if (!matchesCategory) return false;
    if (productFilter === "active") return product.active;
    if (productFilter === "inactive") return !product.active;
    if (productFilter === "featured") return product.featured;
    if (productFilter === "in_stock") return totalStock > 0;
    if (productFilter === "low_stock") return hasLowStock;
    if (productFilter === "out_of_stock") return totalStock <= 0;

    return true;
  });
  const visibleProducts = [...filteredProducts].sort((first, second) => {
    if (productSort === "oldest") return first.id - second.id;
    if (productSort === "name_asc") {
      return first.name.localeCompare(second.name, "es");
    }
    if (productSort === "stock_asc") {
      return getProductTotalStock(first) - getProductTotalStock(second);
    }
    if (productSort === "stock_desc") {
      return getProductTotalStock(second) - getProductTotalStock(first);
    }
    if (productSort === "price_asc") return first.price - second.price;
    if (productSort === "price_desc") return second.price - first.price;

    return second.id - first.id;
  });
  const hasProductFilters =
    normalizedProductSearch.length > 0 ||
    productFilter !== "all" ||
    productCategoryFilter !== "all" ||
    productSort !== "recent";
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
    <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">
            Productos
          </h2>

          <p className="mt-2 text-base font-medium text-zinc-400">
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
              className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
            />
          </div>

          <button
            type="button"
            onClick={onCreateProduct}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-black transition hover:opacity-90 cursor-pointer"
          >
            <Plus size={18} />
            Nuevo producto
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,260px)_minmax(180px,240px)_1fr] lg:items-end">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Categoria
            </span>

            <select
              value={productCategoryFilter}
              onChange={(event) => {
                setProductCategoryFilter(event.target.value);
                setProductPage(1);
              }}
              className="h-11 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-zinc-500"
            >
              <option value="all">Todas las categorias</option>
              {categories.map((categoryOption) => (
                <option
                  key={categoryOption.value}
                  value={categoryOption.value}
                >
                  {categoryOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Ordenar por
            </span>

            <select
              value={productSort}
              onChange={(event) => {
                setProductSort(event.target.value as ProductSort);
                setProductPage(1);
              }}
              className="h-11 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-zinc-500"
            >
              <option value="recent">Mas recientes</option>
              <option value="oldest">Mas antiguos</option>
              <option value="name_asc">Nombre A-Z</option>
              <option value="stock_asc">Menor stock</option>
              <option value="stock_desc">Mayor stock</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "Todos"],
              ["active", "Publicados"],
              ["inactive", "Ocultos"],
              ["featured", "Destacados"],
              ["low_stock", "Stock bajo"],
              ["out_of_stock", "Sin stock"],
            ] as [ProductFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setProductFilter(value);
                  setProductPage(1);
                }}
                className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
                  productFilter === value
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}

            {hasProductFilters && (
              <button
                type="button"
                onClick={() => {
                  setProductFilter("all");
                  setProductCategoryFilter("all");
                  setProductSearch("");
                  setProductSort("recent");
                  setProductPage(1);
                }}
                className="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
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
          const skuParts = getSkuParts(product.sku);

          return (
            <div
              key={product.id}
              className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700 xl:grid-cols-[minmax(420px,1fr)_150px] xl:items-center"
            >
            <div className="flex min-w-0 items-center gap-4">
              <Image
                src={getProductImage(product)}
                alt={product.name}
                width={76}
                height={76}
                className="h-[76px] w-[76px] shrink-0 rounded-xl bg-zinc-950 object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="max-w-full truncate text-xl font-bold text-white">
                    {product.name}
                  </h3>

                  <button
                    type="button"
                    onClick={() => onToggleActive(product)}
                    disabled={isSavingProduct}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    product.active
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-zinc-800 text-zinc-300"
                  }`}>
                    {isSavingProduct &&
                    savingProductAction.action === "active"
                      ? "Guardando..."
                      : product.active
                        ? "Publicado"
                        : "Oculto"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFeatured(product)}
                    disabled={isSavingProduct}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                      product.featured
                        ? "bg-amber-400/15 text-amber-200"
                        : "border border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isSavingProduct &&
                    savingProductAction.action === "featured"
                      ? "Guardando..."
                      : product.featured
                        ? "Destacado"
                        : "Destacar"}
                  </button>
                </div>

                <p className="mt-1 truncate text-sm font-medium text-zinc-500">
                  {getCategoryLabel(product.category)} / {product.slug}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {skuParts && (
                    <span className="inline-flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-semibold">
                      {skuParts.prefix && (
                        <span className="border-r border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-zinc-400">
                          {skuParts.prefix}
                        </span>
                      )}
                      <span className="px-3 py-1.5 text-zinc-100">
                        {skuParts.code}
                      </span>
                    </span>
                  )}

                  <span className="rounded-lg bg-zinc-950 px-3 py-1.5 font-semibold text-zinc-100">
                    Mayorista {currencyFormatter.format(product.price)}
                  </span>

                  <span className="rounded-lg bg-zinc-950 px-3 py-1.5 text-zinc-200">
                    Minorista {currencyFormatter.format(getRetailPrice(product))}
                  </span>

                  <span className="rounded-lg bg-zinc-950 px-3 py-1.5 text-zinc-200">
                    Stock {totalStock}
                  </span>

                  <span className="rounded-lg bg-zinc-950 px-3 py-1.5 text-zinc-300">
                    {product.variants.length} colores
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStockProductId((currentId) =>
                        currentId === product.id ? null : product.id
                      )
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white cursor-pointer"
                  >
                    {expandedStockProductId === product.id
                      ? "Ocultar stock"
                      : "Ver stock"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 xl:ml-auto">
              <button
                type="button"
                onClick={() => {
                  setOpenProductMenuId(null);
                  onEdit(product);
                }}
                disabled={isSavingProduct}
                className="h-11 rounded-xl bg-white px-6 text-sm font-semibold text-black transition hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Editar
              </button>

              <div
                className="relative"
                data-product-menu
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenProductMenuId((currentId) =>
                      currentId === product.id ? null : product.id
                    )
                  }
                  disabled={isSavingProduct}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Mas acciones"
                >
                  <MoreVertical size={18} />
                </button>

                {openProductMenuId === product.id && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-10 min-w-36 rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-xl shadow-black/30">
                    <button
                      type="button"
                      onClick={async () => {
                        await onDelete(product);
                        setOpenProductMenuId(null);
                      }}
                      disabled={isSavingProduct}
                      className="h-10 w-full rounded-lg px-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProduct &&
                      savingProductAction.action === "delete"
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {expandedStockProductId === product.id && (
              <div className="col-span-full grid gap-2 border-t border-zinc-800 pt-4">
                {product.variants.map((variant) => (
                  <div
                    key={variant.color}
                    className="flex flex-col gap-3 rounded-xl bg-zinc-950 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-32 items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-zinc-700"
                        style={{ backgroundColor: variant.hex || "#000000" }}
                      />

                      <p className="text-sm font-semibold text-white">
                        {variant.color}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {variant.sizes.map((size) => (
                        <span
                          key={size.size}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                            size.stock <= 0
                              ? "bg-red-500/10 text-red-300"
                              : size.stock <= 3
                                ? "bg-amber-400/10 text-amber-200"
                                : "bg-zinc-800 text-zinc-200"
                          }`}
                        >
                          {size.size}: {size.stock}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
