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

  const updateEditingVariant = (updates: Partial<EditableVariant>) => {
    const updated = [...product.variants];

    updated[editingVariantIndex] = {
      ...updated[editingVariantIndex],
      ...updates,
    };

    updateVariants(updated);
  };

  const updateEditingSize = (
    sizeIndex: number,
    updates: Partial<EditableVariant["sizes"][number]>
  ) => {
    const updated = [...product.variants];

    updated[editingVariantIndex].sizes =
      updated[editingVariantIndex].sizes.map((size, index) =>
        index === sizeIndex
          ? {
              ...size,
              ...updates,
            }
          : size
      );

    updateVariants(updated);
  };

  if (!editingVariant) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/70 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              Editar producto
            </p>
            <h2 className="mt-0.5 truncate text-xl font-black text-white">
              {product.name || "Producto"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-800 text-sm font-black text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            x
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {productFormError && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {productFormError}
            </p>
          )}

          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <div className="grid content-start gap-3">
              <section className="grid gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Datos
                </h3>

                <label className="grid min-w-0 gap-1.5">
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
                    className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                  />
                </label>

                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <label className="grid min-w-0 gap-1.5">
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
                      className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      SKU / Codigo
                    </span>
                    <div className="flex h-9 overflow-hidden rounded-xl bg-zinc-800">
                      <span className="flex items-center bg-zinc-950 px-2.5 text-xs font-bold text-zinc-400">
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
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      />
                    </div>
                  </label>
                </div>

                <label className="grid min-w-0 gap-1.5">
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
                    className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
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
              </section>

              <section className="grid gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Precios y venta
                </h3>

                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="grid min-w-0 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Costo
                    </span>
                    <input
                      type="number"
                      value={product.cost}
                      onChange={(event) =>
                        updateProduct({
                          cost: event.target.value,
                        })
                      }
                      className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
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
                      className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Precio curva
                    </span>
                    <input
                      type="number"
                      value={product.curvePrice}
                      onChange={(event) =>
                        updateProduct({
                          curvePrice: event.target.value,
                        })
                      }
                      className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
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
                      className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateProduct({ saleMode: "unit" })}
                    className={`h-9 rounded-xl text-sm font-bold transition ${
                      product.saleMode === "unit"
                        ? "bg-white text-black"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Unidad
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProduct({ saleMode: "curve" })}
                    className={`h-9 rounded-xl text-sm font-bold transition ${
                      product.saleMode === "curve"
                        ? "bg-white text-black"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Unidad + curva
                  </button>
                </div>
              </section>

              <section className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Detalles
                </h3>
                <textarea
                  value={detailsText}
                  onChange={(event) => setDetailsText(event.target.value)}
                  placeholder="Uno por linea"
                  className="min-h-24 resize-none rounded-xl bg-zinc-800 p-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                />
              </section>
            </div>

            <div className="grid content-start gap-3">
              <section className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase text-zinc-300">
                    Colores
                  </h3>
                  <span className="text-xs text-zinc-500">
                    El primero es principal
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
                        className={`grid gap-2 rounded-xl border p-1.5 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                          editingVariantIndex === index
                            ? "border-white bg-zinc-900"
                            : "border-zinc-800 bg-zinc-900/60"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditingVariantIndex(index)}
                          className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
                        >
                          <span
                            className="h-7 w-7 shrink-0 rounded-full border border-zinc-700"
                            style={{
                              backgroundColor: variant.hex || "#000000",
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">
                              {variant.color || `Color ${index + 1}`}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                              {index === 0 && (
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-200">
                                  Principal
                                </span>
                              )}
                              <span className="rounded-full bg-zinc-950 px-1.5 py-0.5">
                                {variant.images.length} img.
                              </span>
                              <span className="rounded-full bg-zinc-950 px-1.5 py-0.5">
                                {totalStock} stock
                              </span>
                            </span>
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 sm:justify-end">
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
                            title="Subir color"
                            className="h-7 w-7 cursor-pointer rounded-lg border border-zinc-700 text-xs font-black text-zinc-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ^
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
                            title="Bajar color"
                            className="h-7 w-7 cursor-pointer rounded-lg border border-zinc-700 text-xs font-black text-zinc-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            v
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
                  className="h-9 cursor-pointer rounded-xl border border-dashed border-zinc-600 bg-zinc-800 px-4 text-sm font-bold transition hover:border-white"
                >
                  + Agregar color
                </button>
              </section>

              <section className="grid gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid min-w-52 flex-1 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Color seleccionado
                    </span>
                    <input
                      type="text"
                      value={editingVariant.color}
                      onChange={(event) =>
                        updateEditingVariant({
                          color: event.target.value,
                        })
                      }
                      className="h-9 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Swatch
                    </span>
                    <input
                      type="color"
                      value={editingVariant.hex || "#000000"}
                      onChange={(event) =>
                        updateEditingVariant({
                          hex: event.target.value,
                        })
                      }
                      className="h-9 w-16 cursor-pointer overflow-hidden rounded-xl bg-transparent"
                    />
                  </label>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-zinc-500">
                      Talles y stock
                    </h4>
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
                      className="h-8 rounded-lg border border-dashed border-zinc-600 px-3 text-xs font-bold text-zinc-300 transition hover:border-white hover:text-white"
                    >
                      + Talle
                    </button>
                  </div>

                  <div className="grid gap-1.5">
                    <div className="grid grid-cols-[minmax(0,1fr)_96px_36px] gap-2 px-1 text-[10px] font-black uppercase text-zinc-500">
                      <span>Talle</span>
                      <span className="text-center">Stock</span>
                      <span />
                    </div>
                    {editingVariant.sizes.map((sizeItem, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1fr)_96px_36px] gap-2"
                      >
                        <input
                          type="text"
                          value={sizeItem.size}
                          onChange={(event) =>
                            updateEditingSize(index, {
                              size: event.target.value,
                            })
                          }
                          className="h-8 rounded-lg bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                        />
                        <input
                          type="number"
                          value={sizeItem.stock}
                          onChange={(event) =>
                            updateEditingSize(index, {
                              stock: Number(event.target.value),
                            })
                          }
                          className="h-8 rounded-lg bg-zinc-800 px-3 text-center text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
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
                          className="h-8 rounded-lg bg-red-500/15 text-sm font-black text-red-200 transition hover:bg-red-500/25"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black uppercase text-zinc-300">
                      Imagenes
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                      {editingVariant.images.length} imagenes cargadas
                    </p>
                  </div>
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200">
                    Agregar
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        updateEditingVariant({
                          images: [
                            ...editingVariant.images,
                            ...Array.from(event.target.files || []),
                          ],
                        });
                        event.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {editingVariant.images.map((image, imageIndex) => {
                    const imageUrl = getImageUrl(image);

                    return (
                      <div
                        key={`${imageUrl}-${imageIndex}`}
                        className="relative aspect-square"
                      >
                        <Image
                          src={imageUrl}
                          alt=""
                          width={76}
                          height={76}
                          unoptimized={typeof image !== "string"}
                          className={`h-full w-full rounded-xl border object-cover ${
                            imageIndex === 0
                              ? "border-emerald-300"
                              : "border-zinc-700"
                          }`}
                        />

                        {imageIndex === 0 && (
                          <span className="absolute bottom-1 left-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                            Principal
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            updateEditingVariant({
                              images: editingVariant.images.filter(
                                (_, itemIndex) => itemIndex !== imageIndex
                              ),
                            });
                          }}
                          className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-red-500 text-xs font-black text-white shadow-lg shadow-black/40 transition hover:bg-red-400"
                        >
                          x
                        </button>

                        <div className="absolute right-1 top-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (imageIndex === 0) return;
                              const images = [...editingVariant.images];

                              [images[imageIndex - 1], images[imageIndex]] = [
                                images[imageIndex],
                                images[imageIndex - 1],
                              ];

                              updateEditingVariant({ images });
                            }}
                            title="Mover a la izquierda"
                            className="h-6 w-6 rounded-full bg-black/70 text-xs font-black text-white transition hover:bg-black"
                          >
                            {"<"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (imageIndex === editingVariant.images.length - 1) {
                                return;
                              }

                              const images = [...editingVariant.images];

                              [images[imageIndex + 1], images[imageIndex]] = [
                                images[imageIndex],
                                images[imageIndex + 1],
                              ];

                              updateEditingVariant({ images });
                            }}
                            title="Mover a la derecha"
                            className="h-6 w-6 rounded-full bg-black/70 text-xs font-black text-white transition hover:bg-black"
                          >
                            {">"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-xl bg-zinc-800 px-4 text-sm font-bold text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="h-10 cursor-pointer rounded-xl bg-white px-5 text-sm font-black text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </footer>
      </div>
    </div>
  );
}
