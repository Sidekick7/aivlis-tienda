"use client";

import Image from "next/image";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  currencyFormatter,
  getProductImage,
  getProductTotalStock,
} from "@/app/admin/adminUtils";
import { isCurveProduct } from "@/lib/curve";
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
    const matchesCategory =
      productCategoryFilter === "all" ||
      product.category === productCategoryFilter;

    if (!matchesCategory) return false;
    if (productFilter === "active") return product.active;
    if (productFilter === "inactive") return !product.active;

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

    if (first.featured !== second.featured) {
      return Number(second.featured) - Number(first.featured);
    }

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
    <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-9 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black uppercase text-zinc-300 ring-1 ring-zinc-800">
              {visibleProducts.length} de {products.length}
            </span>

            <label>
              <span className="sr-only">Categoria</span>
              <select
                value={productCategoryFilter}
                onChange={(event) => {
                  setProductCategoryFilter(event.target.value);
                  setProductPage(1);
                }}
                className="h-9 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-zinc-500"
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

            <label>
              <span className="sr-only">Ordenar por</span>
              <select
                value={productSort}
                onChange={(event) => {
                  setProductSort(event.target.value as ProductSort);
                  setProductPage(1);
                }}
                className="h-9 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-zinc-500"
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

            {([
              ["all", "Todos"],
              ["active", "Publicados"],
              ["inactive", "Ocultos"],
            ] as [ProductFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setProductFilter(value);
                  setProductPage(1);
                }}
                className={`h-9 rounded-xl px-3 text-xs font-bold transition cursor-pointer ${
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
                className="h-9 rounded-xl border border-zinc-700 px-3 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:items-center">
            <div className="relative w-full xl:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                type="search"
                placeholder="Buscar producto o SKU"
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setProductPage(1);
                }}
                className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
              />
            </div>

          <button
            type="button"
            onClick={onCreateProduct}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:opacity-90 cursor-pointer"
          >
            <Plus size={16} />
            Nuevo producto
          </button>
          </div>
        </div>
      </div>

      {visibleProducts.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
          No hay productos que coincidan con la busqueda.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#070707] shadow-2xl shadow-black/20">
        <div className="hidden grid-cols-[76px_64px_minmax(220px,1fr)_116px_104px_104px_64px_142px_108px] gap-2 border-b border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-bold uppercase text-zinc-400 xl:grid">
          <span>SKU</span>
          <span className="text-center">Foto</span>
          <span>Producto</span>
          <span className="text-center">Categoria</span>
          <span className="text-center">Mayorista</span>
          <span className="text-center">Curva</span>
          <span className="text-center">Stock</span>
          <span className="text-center">Estado</span>
          <span className="text-center">Acciones</span>
        </div>

        <div>
        {paginatedProducts.map((product, index) => {
          const isSavingProduct =
            savingProductAction?.id === product.id;
          const totalStock = getProductTotalStock(product);
          const skuParts = getSkuParts(product.sku);
          const stockStatus =
            totalStock <= 0
              ? "Sin stock"
              : product.variants.some((variant) =>
                  variant.sizes.some(
                    (size) => size.stock > 0 && size.stock <= 3
                  )
                )
                ? "Stock bajo"
                : "Stock OK";

          return (
            <div
              key={product.id}
              className={`border-b border-zinc-900/80 px-3 py-2 transition hover:bg-zinc-900/70 ${
                index % 2 === 0 ? "bg-zinc-950/45" : "bg-zinc-900/20"
              }`}
            >
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setExpandedStockProductId((currentId) =>
                  currentId === product.id ? null : product.id
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExpandedStockProductId((currentId) =>
                    currentId === product.id ? null : product.id
                  );
                }
              }}
              className="grid cursor-pointer gap-2 rounded-lg xl:grid-cols-[76px_64px_minmax(220px,1fr)_116px_104px_104px_64px_142px_108px] xl:items-center"
            >
              <div className="flex h-full items-center">
                {skuParts && (
                    <span className="inline-flex rounded-lg bg-black px-2.5 py-1 text-xs font-black text-zinc-100 ring-1 ring-zinc-800">
                      {skuParts.code}
                    </span>
                )}
              </div>

              <Image
                src={getProductImage(product)}
                alt={product.name}
                width={56}
                height={56}
                className="mx-auto h-14 w-14 shrink-0 rounded-lg bg-zinc-950 object-cover"
              />

              <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-white">
                    {product.name}
                  </h3>

                <p className="mt-0.5 truncate text-xs font-medium text-zinc-500 xl:hidden">
                  {getCategoryLabel(product.category)}
                </p>
              </div>

              <span className="truncate text-sm font-semibold text-zinc-300 xl:hidden">
                Categoria: {getCategoryLabel(product.category)}
              </span>
              <span className="hidden h-full items-center justify-center truncate text-center text-xs font-semibold text-zinc-300 xl:flex">
                {getCategoryLabel(product.category)}
              </span>

              <span className="flex h-full items-center justify-center text-center text-sm font-black text-white tabular-nums">
                {currencyFormatter.format(product.price)}
              </span>

              <div className="hidden h-full flex-col items-center justify-center gap-0.5 xl:flex">
                {isCurveProduct(product) ? (
                  <span className="text-sm font-black text-white tabular-nums">
                    {currencyFormatter.format(product.curvePrice)}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-zinc-600">-</span>
                )}
              </div>

              <span
                className={`mx-auto flex h-7 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-black ${
                  totalStock <= 0
                    ? "bg-red-500/10 text-red-200"
                    : stockStatus === "Stock bajo"
                      ? "bg-amber-400/10 text-amber-200"
                      : "bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {totalStock}
              </span>

              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleActive(product);
                  }}
                  disabled={isSavingProduct}
                  className={`flex h-6 items-center rounded-full px-2.5 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    product.active
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {isSavingProduct &&
                  savingProductAction.action === "active"
                    ? "..."
                    : product.active
                      ? "Publicado"
                      : "Oculto"}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFeatured(product);
                  }}
                  disabled={isSavingProduct}
                  className={`flex h-6 items-center rounded-full px-2.5 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    product.featured
                      ? "bg-amber-400/15 text-amber-200"
                      : "border border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {isSavingProduct &&
                  savingProductAction.action === "featured"
                    ? "..."
                    : product.featured
                      ? "Destacado"
                      : "Destacar"}
                </button>
              </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenProductMenuId(null);
                  onEdit(product);
                }}
                disabled={isSavingProduct}
                className="h-8 rounded-lg bg-white px-4 text-xs font-bold text-black transition hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Editar
              </button>

              <div
                className="relative"
                data-product-menu
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenProductMenuId((currentId) =>
                      currentId === product.id ? null : product.id
                    );
                  }}
                  disabled={isSavingProduct}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Mas acciones"
                >
                  <MoreVertical size={18} />
                </button>

                {openProductMenuId === product.id && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-10 min-w-36 rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-xl shadow-black/30">
                    <button
                      type="button"
                      onClick={async (event) => {
                        event.stopPropagation();
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
            </div>

            {expandedStockProductId === product.id && (
              <div className="mt-2 border-t border-zinc-800 px-1 pb-1 pt-2">
                <div className="grid gap-1.5">
                {product.variants.map((variant) => {
                  const hasVariantStock = variant.sizes.some(
                    (size) => size.stock > 0
                  );

                  return (
                    <div
                      key={variant.color}
                      className={`grid gap-1.5 rounded-lg px-2 py-1.5 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center ${
                        hasVariantStock
                          ? "bg-black"
                          : "bg-black/45 opacity-60"
                      }`}
                    >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700"
                        style={{ backgroundColor: variant.hex || "#000000" }}
                      />

                      <p
                        className={`truncate text-xs font-bold uppercase ${
                          hasVariantStock ? "text-white" : "text-zinc-500"
                        }`}
                      >
                        {variant.color}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {variant.sizes.map((size) => {
                        const hasStock = size.stock > 0;

                        return (
                          <span
                            key={size.size}
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                              hasStock
                                ? "bg-zinc-900 text-zinc-300"
                                : "bg-zinc-950 text-zinc-600 ring-1 ring-zinc-900"
                            }`}
                          >
                            <span className={hasStock ? "" : "line-through"}>
                              {size.size}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-black ${
                                hasStock
                                  ? "bg-emerald-900/80 text-emerald-100"
                                  : "bg-zinc-900 text-zinc-600"
                              }`}
                            >
                              {size.stock}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
          );
        })}
        </div>
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
