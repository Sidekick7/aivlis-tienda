"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import {
  formatSku,
  getSkuCode,
  normalizeSkuCode,
  skuPrefix,
} from "@/app/admin/adminUtils";
import type {
  EditableProduct,
  EditableVariant,
} from "@/app/admin/adminTypes";
import type { StoreCategory } from "@/types/category";

type Props = {
  product: EditableProduct;
  setProduct: Dispatch<SetStateAction<EditableProduct | null>>;
  productFormError: string;
  detailsText: string;
  setDetailsText: Dispatch<SetStateAction<string>>;
  categories: StoreCategory[];
  editingVariantIndex: number;
  setEditingVariantIndex: Dispatch<SetStateAction<number>>;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
};

function getImageUrl(image: string | File) {
  return typeof image === "string"
    ? image
    : URL.createObjectURL(image);
}

export default function EditProductModal({
  product,
  setProduct,
  productFormError,
  detailsText,
  setDetailsText,
  categories,
  editingVariantIndex,
  setEditingVariantIndex,
  isSaving,
  onClose,
  onSave,
}: Props) {
  const editingVariant =
    product.variants[editingVariantIndex] || product.variants[0];

  const updateProduct = (updates: Partial<EditableProduct>) => {
    setProduct({
      ...product,
      ...updates,
    });
  };

  const updateVariants = (variants: EditableVariant[]) => {
    updateProduct({ variants });
  };

  if (!editingVariant) return null;

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
            Editar producto
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
                value={product.name}
                onChange={(event) =>
                  updateProduct({
                    name: event.target.value,
                  })
                }
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
                  value={product.slug}
                  onChange={(event) =>
                    updateProduct({
                      slug: event.target.value,
                    })
                  }
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
                    value={getSkuCode(product.sku)}
                    maxLength={6}
                    onChange={(event) =>
                      updateProduct({
                        sku: formatSku(
                          normalizeSkuCode(event.target.value)
                        ),
                      })
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
                  value={product.price}
                  onChange={(event) =>
                    updateProduct({
                      price: event.target.value,
                    })
                  }
                  className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Precio minorista
                </span>

                <input
                  type="number"
                  value={product.retailPrice}
                  onChange={(event) =>
                    updateProduct({
                      retailPrice: event.target.value,
                    })
                  }
                  className="h-12 min-w-0 rounded-xl bg-zinc-800 px-4 outline-none"
                />
              </label>

              <label className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Categoria
                </span>

                <select
                  value={product.category}
                  onChange={(event) =>
                    updateProduct({
                      category: event.target.value,
                    })
                  }
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
            value={detailsText}
            onChange={(event) =>
              setDetailsText(event.target.value)
            }
            placeholder="Detalles del producto, uno por linea"
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
              {product.variants.map((variant, index) => {
                const totalStock = variant.sizes.reduce(
                  (total, size) => total + Number(size.stock || 0),
                  0
                );

                return (
                  <div
                    key={index}
                    className={`grid gap-2 rounded-xl border p-2 transition sm:grid-cols-[1fr_auto] sm:items-center ${
                      editingVariantIndex === index
                        ? "border-white bg-zinc-900"
                        : "border-zinc-800 bg-zinc-900/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingVariantIndex(index)}
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

                          const updated = [...product.variants];

                          [updated[index - 1], updated[index]] = [
                            updated[index],
                            updated[index - 1],
                          ];

                          updateVariants(updated);
                          setEditingVariantIndex(index - 1);
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
                          if (index === product.variants.length - 1) return;

                          const updated = [...product.variants];

                          [updated[index + 1], updated[index]] = [
                            updated[index],
                            updated[index + 1],
                          ];

                          updateVariants(updated);
                          setEditingVariantIndex(index + 1);
                        }}
                        disabled={index === product.variants.length - 1}
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
                  ...product.variants,
                  {
                    color: "",
                    hex: "#000000",
                    sizes: [
                      {
                        size: "S",
                        stock: 0,
                      },
                    ],
                    images: [],
                  },
                ];

                updateVariants(updated);
                setEditingVariantIndex(updated.length - 1);
              }}
              className="h-10 rounded-xl border border-dashed border-zinc-600 bg-zinc-800 px-4 transition hover:border-white cursor-pointer"
            >
              + Agregar color
            </button>
          </div>

          <input
            type="text"
            value={editingVariant.color}
            onChange={(event) => {
              const updated = [...product.variants];

              updated[editingVariantIndex].color =
                event.target.value;

              updateVariants(updated);
            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
          />

          <input
            type="color"
            value={editingVariant.hex || "#000000"}
            onChange={(event) => {
              const updated = [...product.variants];

              updated[editingVariantIndex].hex =
                event.target.value;

              updateVariants(updated);
            }}
            className="w-20 h-12 rounded-xl overflow-hidden bg-transparent cursor-pointer"
          />

          <div className="flex flex-col gap-3">
            {editingVariant.sizes.map((sizeItem, index) => (
              <div
                key={index}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={sizeItem.size}
                  onChange={(event) => {
                    const updated = [...product.variants];

                    updated[editingVariantIndex].sizes[
                      index
                    ].size = event.target.value;

                    updateVariants(updated);
                  }}
                  className="h-12 px-4 rounded-xl bg-zinc-800 outline-none flex-1"
                />

                <input
                  type="number"
                  value={sizeItem.stock}
                  onChange={(event) => {
                    const updated = [...product.variants];

                    updated[editingVariantIndex].sizes[
                      index
                    ].stock = Number(event.target.value);

                    updateVariants(updated);
                  }}
                  className="h-12 px-4 rounded-xl bg-zinc-800 outline-none w-32"
                />

                <button
                  type="button"
                  onClick={() => {
                    const updated = [...product.variants];

                    updated[editingVariantIndex].sizes =
                      updated[editingVariantIndex].sizes.filter(
                        (_, itemIndex) => itemIndex !== index
                      );

                    updateVariants(updated);
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
                const updated = [...product.variants];

                updated[editingVariantIndex].sizes.push({
                  size: "",
                  stock: 0,
                });

                updateVariants(updated);
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
              const updated = [...product.variants];

              updated[editingVariantIndex].images = [
                ...updated[editingVariantIndex].images,
                ...Array.from(event.target.files || []),
              ];

              updateVariants(updated);
            }}
            className="text-sm text-zinc-400"
          />

          <div className="flex gap-3 flex-wrap">
            {editingVariant.images.map((image) => {
              const imageUrl = getImageUrl(image);

              return (
                <div
                  key={imageUrl}
                  className="relative"
                >
                  <Image
                    src={imageUrl}
                    alt=""
                    width={80}
                    height={80}
                    unoptimized={typeof image !== "string"}
                    className="w-20 h-20 object-cover rounded-xl border border-zinc-700"
                  />

                  <button
                    onClick={() => {
                      const updated = [...product.variants];

                      updated[editingVariantIndex].images =
                        updated[
                          editingVariantIndex
                        ].images.filter((item) => item !== image);

                      updateVariants(updated);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:bg-red-400 transition cursor-pointer"
                  >
                    x
                  </button>

                  <div className="absolute bottom-1 left-1 flex gap-1">
                    <button
                      onClick={() => {
                        const index =
                          product.variants[
                            editingVariantIndex
                          ].images.indexOf(image);

                        if (index === 0) return;

                        const updated = [...product.variants];
                        const images =
                          updated[editingVariantIndex].images;

                        [images[index - 1], images[index]] = [
                          images[index],
                          images[index - 1],
                        ];

                        updateVariants(updated);
                      }}
                      className="w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                    >
                      {"<"}
                    </button>

                    <button
                      onClick={() => {
                        const index =
                          product.variants[
                            editingVariantIndex
                          ].images.indexOf(image);
                        const updated = [...product.variants];
                        const images =
                          updated[editingVariantIndex].images;

                        if (index === images.length - 1) return;

                        [images[index + 1], images[index]] = [
                          images[index],
                          images[index + 1],
                        ];

                        updateVariants(updated);
                      }}
                      className="w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                    >
                      {">"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="h-12 bg-white text-black rounded-xl font-semibold hover:opacity-90 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
