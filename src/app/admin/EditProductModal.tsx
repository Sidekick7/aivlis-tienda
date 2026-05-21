"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
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

          <input
            type="text"
            value={product.name}
            onChange={(event) =>
              updateProduct({
                name: event.target.value,
              })
            }
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
          />

          <input
            type="text"
            value={product.slug}
            onChange={(event) =>
              updateProduct({
                slug: event.target.value,
              })
            }
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
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
                className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
              />
            </label>

            <label className="grid gap-2">
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
                className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
              />
            </label>
          </div>

          <select
            value={product.category}
            onChange={(event) =>
              updateProduct({
                category: event.target.value,
              })
            }
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

          <textarea
            value={product.description}
            onChange={(event) =>
              updateProduct({
                description: event.target.value,
              })
            }
            className="min-h-[140px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
          />

          <textarea
            value={detailsText}
            onChange={(event) =>
              setDetailsText(event.target.value)
            }
            placeholder="Detalles del producto, uno por linea"
            className="min-h-[110px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
          />

          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setEditingVariantIndex(index)}
                className={`px-4 h-10 rounded-xl border transition cursor-pointer ${
                  editingVariantIndex === index
                    ? "bg-white text-black border-white"
                    : "bg-zinc-800 text-white border-zinc-700"
                }`}
              >
                {variant.color || `Color ${index + 1}`}
              </button>
            ))}
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
