"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import {
  createEmptyProductVariant,
  normalizeSkuCode,
  skuPrefix,
  slugifyProductName,
} from "@/app/admin/adminUtils";
import type { NewProductVariant } from "@/app/admin/adminTypes";
import type { StoreCategory } from "@/types/category";

type Props = {
  productFormError: string;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  slug: string;
  setSlug: Dispatch<SetStateAction<string>>;
  skuCode: string;
  setSkuCode: Dispatch<SetStateAction<string>>;
  isSlugEdited: boolean;
  setIsSlugEdited: Dispatch<SetStateAction<boolean>>;
  price: string;
  setPrice: Dispatch<SetStateAction<string>>;
  retailPrice: string;
  setRetailPrice: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  categories: StoreCategory[];
  detailsText: string;
  setDetailsText: Dispatch<SetStateAction<string>>;
  variants: NewProductVariant[];
  setVariants: Dispatch<SetStateAction<NewProductVariant[]>>;
  selectedVariantIndex: number;
  setSelectedVariantIndex: Dispatch<SetStateAction<number>>;
  isSaving: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
};

export default function CreateProductModal({
  productFormError,
  name,
  setName,
  slug,
  setSlug,
  skuCode,
  setSkuCode,
  isSlugEdited,
  setIsSlugEdited,
  price,
  setPrice,
  retailPrice,
  setRetailPrice,
  category,
  setCategory,
  categories,
  detailsText,
  setDetailsText,
  variants,
  setVariants,
  selectedVariantIndex,
  setSelectedVariantIndex,
  isSaving,
  onClose,
  onCreate,
}: Props) {
  const selectedVariant =
    variants[selectedVariantIndex] || variants[0];

  if (!selectedVariant) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-3"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overflow-x-hidden rounded-3xl bg-zinc-900 p-4 sm:p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">
            Nuevo producto
          </h2>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-zinc-400 hover:text-white transition cursor-pointer"
          >
            x
          </button>
        </div>

        <div className="grid gap-5">
          {productFormError && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {productFormError}
            </p>
          )}

          <div className="grid min-w-0 gap-3">
            <label className="grid min-w-0 gap-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Nombre
              </span>

              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;

                  setName(nextName);

                  if (!isSlugEdited) {
                    setSlug(slugifyProductName(nextName));
                  }
                }}
                className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
              />
            </label>

            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Slug
                </span>

                <input
                  type="text"
                  placeholder="Slug"
                  value={slug}
                  onChange={(event) => {
                    setIsSlugEdited(true);
                    setSlug(slugifyProductName(event.target.value));
                  }}
                  className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  SKU / Codigo
                </span>

                <div className="flex h-12 overflow-hidden rounded-xl bg-zinc-800">
                  <span className="flex items-center bg-zinc-950 px-3 text-sm font-semibold text-zinc-400">
                    {skuPrefix}
                  </span>

                  <input
                    type="text"
                    placeholder="Auto"
                    value={skuCode}
                    maxLength={6}
                    onChange={(event) =>
                      setSkuCode(normalizeSkuCode(event.target.value))
                    }
                    className="min-w-0 flex-1 bg-transparent px-3 outline-none"
                  />
                </div>
              </label>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Precio mayorista
                </span>

                <input
                  type="number"
                  placeholder="Mayorista"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Precio minorista
                </span>

                <input
                  type="number"
                  placeholder="Minorista"
                  value={retailPrice}
                  onChange={(event) =>
                    setRetailPrice(event.target.value)
                  }
                  className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Categoria
                </span>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
                >
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
            </div>
          </div>

          <textarea
            placeholder="Detalles del producto, uno por linea"
            value={detailsText}
            onChange={(event) =>
              setDetailsText(event.target.value)
            }
            className="min-h-[110px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
          />

          <div className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Colores del producto
              </p>

              <span className="text-xs text-zinc-500">
                El primero se muestra como principal
              </span>
            </div>

            <div className="grid gap-2">
              {variants.map((variant, index) => {
                const totalStock = variant.sizes.reduce(
                  (total, size) => total + Number(size.stock || 0),
                  0
                );

                return (
                  <div
                    key={index}
                    className={`grid gap-2 rounded-xl border p-2 transition sm:grid-cols-[1fr_auto] sm:items-center ${
                      selectedVariantIndex === index
                        ? "border-white bg-zinc-900"
                        : "border-zinc-800 bg-zinc-900/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedVariantIndex(index)}
                      className="flex min-w-0 items-center gap-3 text-left cursor-pointer"
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-full border border-zinc-700"
                        style={{
                          backgroundColor: variant.hex || "#000000",
                        }}
                      />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {variant.color || `Color ${index + 1}`}
                        </span>

                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          {index === 0 && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-200">
                              Principal
                            </span>
                          )}
                          <span>{variant.images.length} imagenes</span>
                          <span>{totalStock} stock</span>
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (index === 0) return;

                          const updated = [...variants];

                          [updated[index - 1], updated[index]] = [
                            updated[index],
                            updated[index - 1],
                          ];

                          setVariants(updated);
                          setSelectedVariantIndex(index - 1);
                        }}
                        disabled={index === 0}
                        className="h-9 w-9 rounded-xl border border-zinc-700 text-sm font-bold text-zinc-300 transition hover:border-white hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Subir color"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (index === variants.length - 1) return;

                          const updated = [...variants];

                          [updated[index + 1], updated[index]] = [
                            updated[index],
                            updated[index + 1],
                          ];

                          setVariants(updated);
                          setSelectedVariantIndex(index + 1);
                        }}
                        disabled={index === variants.length - 1}
                        className="h-9 w-9 rounded-xl border border-zinc-700 text-sm font-bold text-zinc-300 transition hover:border-white hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Bajar color"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const updated = [
                  ...variants,
                  createEmptyProductVariant(""),
                ];

                setVariants(updated);
                setSelectedVariantIndex(updated.length - 1);
              }}
              className="h-10 rounded-xl border border-dashed border-zinc-600 bg-zinc-800 px-4 transition hover:border-white cursor-pointer"
            >
              + Agregar color
            </button>
          </div>

          <input
            type="text"
            placeholder="Color"
            value={selectedVariant.color}
            onChange={(event) => {
              const updated = [...variants];

              updated[selectedVariantIndex].color =
                event.target.value;

              setVariants(updated);
            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
          />

          <input
            type="color"
            value={selectedVariant.hex}
            onChange={(event) => {
              const updated = [...variants];

              updated[selectedVariantIndex].hex =
                event.target.value;

              setVariants(updated);
            }}
            className="w-20 h-12 rounded-xl overflow-hidden bg-transparent cursor-pointer"
          />

          <div className="flex flex-col gap-3">
            {selectedVariant.sizes.map((sizeItem, index) => (
              <div
                key={index}
                className="flex gap-3"
              >
                <input
                  type="text"
                  placeholder="Talle"
                  value={sizeItem.size}
                  onChange={(event) => {
                    const updated = [...variants];

                    updated[selectedVariantIndex].sizes[
                      index
                    ].size = event.target.value;

                    setVariants(updated);
                  }}
                  className="h-12 px-4 rounded-xl bg-zinc-800 outline-none flex-1"
                />

                <input
                  type="number"
                  placeholder="Stock"
                  value={sizeItem.stock}
                  onChange={(event) => {
                    const updated = [...variants];

                    updated[selectedVariantIndex].sizes[
                      index
                    ].stock = event.target.value;

                    setVariants(updated);
                  }}
                  className="h-12 px-4 rounded-xl bg-zinc-800 outline-none w-32"
                />

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...variants];

                    updated[selectedVariantIndex].sizes =
                      updated[selectedVariantIndex].sizes.filter(
                        (_, itemIndex) => itemIndex !== index
                      );

                    setVariants(updated);
                  }}
                  className="w-12 rounded-xl bg-red-500"
                >
                  x
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const updated = [...variants];

                updated[selectedVariantIndex].sizes.push({
                  size: "",
                  stock: "",
                });

                setVariants(updated);
              }}
              className="h-11 rounded-xl border border-dashed border-zinc-600"
            >
              + Agregar talle
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Elegir archivo
              <input
                type="file"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);

                  if (files.length === 0) return;

                  const updated = [...variants];

                  updated[selectedVariantIndex].images = files;

                  setVariants(updated);
                  event.currentTarget.value = "";
                }}
                className="sr-only"
              />
            </label>

            {selectedVariant.images.length > 0 && (
              <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-600 text-xl font-semibold text-zinc-300 transition hover:border-white hover:text-white">
                +
                <input
                  type="file"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);

                    if (files.length === 0) return;

                    const updated = [...variants];

                    updated[selectedVariantIndex].images = [
                      ...updated[selectedVariantIndex].images,
                      ...files,
                    ];

                    setVariants(updated);
                    event.currentTarget.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            )}

            <span className="text-sm text-zinc-500">
              {selectedVariant.images.length === 0
                ? "Sin imagenes cargadas"
                : `${selectedVariant.images.length} imagenes cargadas`}
            </span>
          </div>

          <div className="flex gap-3 flex-wrap">
            {selectedVariant.images.map((file, index) => (
              <div
                key={index}
                className="relative"
              >
                <Image
                  src={URL.createObjectURL(file)}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                  className="w-20 h-20 object-cover rounded-xl border border-zinc-700"
                />

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...variants];

                    updated[selectedVariantIndex].images =
                      updated[selectedVariantIndex].images.filter(
                        (_, itemIndex) => itemIndex !== index
                      );

                    setVariants(updated);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={onCreate}
            disabled={isSaving}
            className="h-12 bg-white text-black rounded-xl font-semibold hover:opacity-90 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Creando..." : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
