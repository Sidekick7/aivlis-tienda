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
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
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
  description,
  setDescription,
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
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
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
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
          />

          <input
            type="text"
            placeholder="Slug"
            value={slug}
            onChange={(event) => {
              setIsSlugEdited(true);
              setSlug(slugifyProductName(event.target.value));
            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
          />

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              SKU / Codigo interno
            </span>

            <div className="flex h-12 overflow-hidden rounded-xl bg-zinc-800">
              <span className="flex items-center bg-zinc-950 px-4 text-sm font-semibold text-zinc-400">
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
                className="min-w-0 flex-1 bg-transparent px-4 outline-none"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase text-zinc-500">
                Precio mayorista
              </span>

              <input
                type="number"
                placeholder="Mayorista"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
              />
            </label>

            <label className="grid gap-2">
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
                className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
              />
            </label>
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

          <input
            type="file"
            multiple
            onChange={(event) => {
              const updated = [...variants];

              updated[selectedVariantIndex].images = Array.from(
                event.target.files || []
              );

              setVariants(updated);
            }}
            className="text-sm text-zinc-400"
          />

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

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
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

          <div className="flex flex-wrap gap-2">
            {variants.map((variant, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedVariantIndex(index)}
                className={`px-4 h-10 rounded-xl border transition cursor-pointer ${
                  selectedVariantIndex === index
                    ? "bg-white text-black border-white"
                    : "bg-zinc-800 text-white border-zinc-700"
                }`}
              >
                {variant.color || `Color ${index + 1}`}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setVariants([
                  ...variants,
                  createEmptyProductVariant(""),
                ])
              }
              className="px-4 h-10 rounded-xl bg-zinc-800 border border-dashed border-zinc-600 hover:border-white transition cursor-pointer"
            >
              + Agregar color
            </button>
          </div>

          <textarea
            placeholder="Descripcion"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            className="min-h-[140px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
          />

          <textarea
            placeholder="Detalles del producto, uno por linea"
            value={detailsText}
            onChange={(event) =>
              setDetailsText(event.target.value)
            }
            className="min-h-[110px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
          />

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
