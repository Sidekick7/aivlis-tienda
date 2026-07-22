"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/70 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              Editar producto
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h2 className="truncate text-xl font-black text-white">
                {product.name || "Producto"}
              </h2>
              {getSkuCode(product.sku) && (
                <span className="shrink-0 rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300">
                  SKU {getSkuCode(product.sku)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-800 text-sm font-black text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {productFormError && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {productFormError}
            </p>
          )}

          <div className="grid gap-3 xl:grid-cols-[390px_minmax(0,1fr)]">
            <div className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <section className="grid gap-3 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Informacion general
                </h3>

                <label className="grid w-full max-w-[360px] min-w-0 gap-1.5">
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

                <div className="grid w-fit min-w-0 gap-2 sm:grid-cols-[190px_150px]">
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

                <details className="group w-full max-w-[360px] rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase text-zinc-400 transition hover:text-white">
                    Opciones avanzadas
                  </summary>
                  <label className="grid min-w-0 gap-1.5 border-t border-zinc-800 p-3">
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
                </details>
              </section>

              <section className="grid gap-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black uppercase text-zinc-300">
                    Precios y venta
                  </h3>

                  <div className="inline-flex rounded-xl bg-zinc-900 p-1">
                    <button
                      type="button"
                      onClick={() => updateProduct({ saleMode: "unit" })}
                      className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                        product.saleMode === "unit"
                          ? "bg-white text-black"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Unidad
                    </button>
                    <button
                      type="button"
                      onClick={() => updateProduct({ saleMode: "curve" })}
                      className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                        product.saleMode === "curve"
                          ? "bg-white text-black"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Unidad + curva
                    </button>
                  </div>
                </div>

                <div className="grid max-w-[360px] grid-cols-2 gap-2">
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
                      disabled={product.saleMode !== "curve"}
                      onChange={(event) =>
                        updateProduct({
                          curvePrice: event.target.value,
                        })
                      }
                      className="h-9 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white disabled:cursor-not-allowed disabled:opacity-35"
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

              </section>

              <section className="grid gap-2 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Detalles
                </h3>
                <textarea
                  value={detailsText}
                  onChange={(event) => setDetailsText(event.target.value)}
                  placeholder="Uno por linea"
                  className="min-h-24 w-full max-w-[360px] resize-none rounded-xl bg-zinc-800 p-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                />
              </section>
            </div>

            <div className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <section className="grid gap-2.5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase text-zinc-300">
                      Colores
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      El primero es principal
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = [
                        ...product.variants,
                        {
                          color: "",
                          hex: "#000000",
                          sizes: [{ size: "", stock: 0 }],
                          images: [],
                        },
                      ];

                      updateVariants(updated);
                      setEditingVariantIndex(updated.length - 1);
                    }}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                  >
                    <Plus size={14} />
                    Color
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => {
                    const totalStock = variant.sizes.reduce(
                      (total, size) => total + Number(size.stock || 0),
                      0
                    );

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setEditingVariantIndex(index)}
                        title={`${variant.images.length} imagenes · ${totalStock} stock`}
                        className={`inline-flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-left transition ${
                          editingVariantIndex === index
                            ? "border-white bg-white text-black"
                            : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-zinc-600"
                          style={{
                            backgroundColor: variant.hex || "#000000",
                          }}
                        />
                        <span className="max-w-28 truncate text-sm font-bold">
                          {variant.color || `Color ${index + 1}`}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            editingVariantIndex === index
                              ? "text-zinc-600"
                              : "text-zinc-500"
                          }`}
                        >
                          {totalStock}
                        </span>
                        {index === 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-2.5 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid w-full gap-1.5 sm:w-[140px]">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Nombre del color
                    </span>
                    <input
                      type="text"
                      value={editingVariant.color}
                      onChange={(event) =>
                        updateEditingVariant({
                          color: event.target.value,
                        })
                      }
                      className="h-9 w-full min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
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
                      className="h-9 w-14 cursor-pointer overflow-hidden rounded-xl bg-transparent"
                    />
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingVariantIndex === 0) return;
                        const updated = [...product.variants];

                        [
                          updated[editingVariantIndex - 1],
                          updated[editingVariantIndex],
                        ] = [
                          updated[editingVariantIndex],
                          updated[editingVariantIndex - 1],
                        ];

                        updateVariants(updated);
                        setEditingVariantIndex(editingVariantIndex - 1);
                      }}
                      disabled={editingVariantIndex === 0}
                      title="Subir color"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          editingVariantIndex ===
                          product.variants.length - 1
                        ) {
                          return;
                        }
                        const updated = [...product.variants];

                        [
                          updated[editingVariantIndex + 1],
                          updated[editingVariantIndex],
                        ] = [
                          updated[editingVariantIndex],
                          updated[editingVariantIndex + 1],
                        ];

                        updateVariants(updated);
                        setEditingVariantIndex(editingVariantIndex + 1);
                      }}
                      disabled={
                        editingVariantIndex === product.variants.length - 1
                      }
                      title="Bajar color"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (product.variants.length === 1) return;
                        const updated = product.variants.filter(
                          (_, index) => index !== editingVariantIndex
                        );

                        updateVariants(updated);
                        setEditingVariantIndex(
                          Math.min(editingVariantIndex, updated.length - 1)
                        );
                      }}
                      disabled={product.variants.length === 1}
                      title="Eliminar color"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-red-500/40 text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid max-w-[280px] gap-2">
                  <div className="flex items-center justify-start gap-4">
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
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-3 text-xs font-bold text-zinc-300 transition hover:border-white hover:text-white"
                    >
                      <Plus size={13} />
                      Talle
                    </button>
                  </div>

                  <div className="grid gap-1.5">
                    <div className="grid grid-cols-[130px_84px_32px] gap-2 px-1 text-[10px] font-black uppercase text-zinc-500">
                      <span>Talle</span>
                      <span className="text-center">Stock</span>
                      <span />
                    </div>
                    {editingVariant.sizes.map((sizeItem, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[130px_84px_32px] gap-2"
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
                          title="Eliminar talle"
                          className="flex h-8 cursor-pointer items-center justify-center rounded-lg bg-red-500/15 text-red-200 transition hover:bg-red-500/25"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-2.5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black uppercase text-zinc-300">
                      Imagenes
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                      {editingVariant.images.length} imagenes cargadas
                    </p>
                  </div>
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200">
                    <Plus size={15} />
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

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {editingVariant.images.map((image, imageIndex) => {
                    const imageUrl = getImageUrl(image);

                    return (
                      <div
                        key={`${imageUrl}-${imageIndex}`}
                        className="relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900"
                      >
                        <Image
                          src={imageUrl}
                          alt=""
                          width={76}
                          height={76}
                          unoptimized={typeof image !== "string"}
                          className={`h-full w-full object-contain ${
                            imageIndex === 0
                              ? "ring-2 ring-inset ring-emerald-300"
                              : ""
                          }`}
                        />

                        <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/75 px-1 text-[10px] font-black text-white">
                          {imageIndex + 1}
                        </span>

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
                          title="Eliminar imagen"
                          className="absolute bottom-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-red-500 text-white shadow-lg shadow-black/40 transition hover:bg-red-400"
                        >
                          <Trash2 size={13} />
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
                            disabled={imageIndex === 0}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-black/75 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronLeft size={14} />
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
                            disabled={
                              imageIndex === editingVariant.images.length - 1
                            }
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-black/75 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronRight size={14} />
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
