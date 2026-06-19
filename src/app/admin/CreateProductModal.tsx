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
import type { Product } from "@/types/product";

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
  cost: string;
  setCost: Dispatch<SetStateAction<string>>;
  saleMode: Product["saleMode"];
  setSaleMode: Dispatch<SetStateAction<Product["saleMode"]>>;
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

function getImageUrl(file: File) {
  return URL.createObjectURL(file);
}

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
  cost,
  setCost,
  saleMode,
  setSaleMode,
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

  const updateSelectedVariant = (
    updates: Partial<NewProductVariant>
  ) => {
    const updated = [...variants];

    updated[selectedVariantIndex] = {
      ...updated[selectedVariantIndex],
      ...updates,
    };

    setVariants(updated);
  };

  const updateSelectedSize = (
    sizeIndex: number,
    updates: Partial<NewProductVariant["sizes"][number]>
  ) => {
    const updated = [...variants];

    updated[selectedVariantIndex].sizes =
      updated[selectedVariantIndex].sizes.map((size, index) =>
        index === sizeIndex
          ? {
              ...size,
              ...updates,
            }
          : size
      );

    setVariants(updated);
  };

  if (!selectedVariant) return null;

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
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              Nuevo producto
            </p>
            <h2 className="mt-1 truncate text-2xl font-black text-white">
              {name || "Producto nuevo"}
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {productFormError && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {productFormError}
            </p>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <div className="grid content-start gap-4">
              <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Datos
                </h3>

                <label className="grid min-w-0 gap-1.5">
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
                    className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                  />
                </label>

                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <label className="grid min-w-0 gap-1.5">
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
                      className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      SKU / Codigo
                    </span>
                    <div className="flex h-10 overflow-hidden rounded-xl bg-zinc-800">
                      <span className="flex items-center bg-zinc-950 px-2.5 text-xs font-bold text-zinc-400">
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
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
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

              <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <h3 className="text-sm font-black uppercase text-zinc-300">
                  Precios y venta
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid min-w-0 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Costo
                    </span>
                    <input
                      type="number"
                      placeholder="Costo"
                      value={cost}
                      onChange={(event) => setCost(event.target.value)}
                      className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Precio web
                    </span>
                    <input
                      type="number"
                      placeholder="Web"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid min-w-0 gap-1.5">
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
                      className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSaleMode("unit")}
                    className={`h-10 rounded-xl text-sm font-bold transition ${
                      saleMode === "unit"
                        ? "bg-white text-black"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Unidad
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleMode("curve")}
                    className={`h-10 rounded-xl text-sm font-bold transition ${
                      saleMode === "curve"
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
                  placeholder="Uno por linea"
                  value={detailsText}
                  onChange={(event) => setDetailsText(event.target.value)}
                  className="min-h-32 resize-none rounded-xl bg-zinc-800 p-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                />
              </section>
            </div>

            <div className="grid content-start gap-4">
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
                  {variants.map((variant, index) => {
                    const totalStock = variant.sizes.reduce(
                      (total, size) => total + Number(size.stock || 0),
                      0
                    );

                    return (
                      <div
                        key={index}
                        className={`grid gap-2 rounded-xl border p-2 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                          selectedVariantIndex === index
                            ? "border-white bg-zinc-900"
                            : "border-zinc-800 bg-zinc-900/60"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedVariantIndex(index)}
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
                            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              {index === 0 && (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-200">
                                  Principal
                                </span>
                              )}
                              <span>{variant.images.length} img.</span>
                              <span>{totalStock} stock</span>
                            </span>
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 sm:justify-end">
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
                            className="h-8 cursor-pointer rounded-lg border border-zinc-700 px-2 text-xs font-bold text-zinc-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            Arriba
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
                            className="h-8 cursor-pointer rounded-lg border border-zinc-700 px-2 text-xs font-bold text-zinc-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            Abajo
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
                  className="h-9 cursor-pointer rounded-xl border border-dashed border-zinc-600 bg-zinc-800 px-4 text-sm font-bold transition hover:border-white"
                >
                  + Agregar color
                </button>
              </section>

              <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid min-w-52 flex-1 gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Color seleccionado
                    </span>
                    <input
                      type="text"
                      placeholder="Color"
                      value={selectedVariant.color}
                      onChange={(event) =>
                        updateSelectedVariant({
                          color: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      Swatch
                    </span>
                    <input
                      type="color"
                      value={selectedVariant.hex}
                      onChange={(event) =>
                        updateSelectedVariant({
                          hex: event.target.value,
                        })
                      }
                      className="h-10 w-16 cursor-pointer overflow-hidden rounded-xl bg-transparent"
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
                        updateSelectedVariant({
                          sizes: [
                            ...selectedVariant.sizes,
                            {
                              size: "",
                              stock: "",
                            },
                          ],
                        });
                      }}
                      className="h-8 rounded-lg border border-dashed border-zinc-600 px-3 text-xs font-bold text-zinc-300 transition hover:border-white hover:text-white"
                    >
                      + Talle
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {selectedVariant.sizes.map((sizeItem, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1fr)_96px_36px] gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Talle"
                          value={sizeItem.size}
                          onChange={(event) =>
                            updateSelectedSize(index, {
                              size: event.target.value,
                            })
                          }
                          className="h-9 rounded-lg bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          value={sizeItem.stock}
                          onChange={(event) =>
                            updateSelectedSize(index, {
                              stock: event.target.value,
                            })
                          }
                          className="h-9 rounded-lg bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedVariant({
                              sizes: selectedVariant.sizes.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            });
                          }}
                          className="h-9 rounded-lg bg-red-500/15 text-sm font-black text-red-200 transition hover:bg-red-500/25"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black uppercase text-zinc-300">
                    Imagenes
                  </h3>
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200">
                    Agregar
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);

                        if (files.length === 0) return;

                        updateSelectedVariant({
                          images: [...selectedVariant.images, ...files],
                        });
                        event.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedVariant.images.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative"
                    >
                      <Image
                        src={getImageUrl(file)}
                        alt=""
                        width={76}
                        height={76}
                        unoptimized
                        className="h-[76px] w-[76px] rounded-xl border border-zinc-700 object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedVariant({
                            images: selectedVariant.images.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          });
                        }}
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-xs font-black text-white"
                      >
                        x
                      </button>
                    </div>
                  ))}
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
            onClick={onCreate}
            disabled={isSaving}
            className="h-10 cursor-pointer rounded-xl bg-white px-5 text-sm font-black text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Creando..." : "Crear producto"}
          </button>
        </footer>
      </div>
    </div>
  );
}
