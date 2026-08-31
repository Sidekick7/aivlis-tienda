"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { getProductImage } from "@/lib/productDisplay";
import type { StoreCategory } from "@/types/category";
import type { HomeContent } from "@/types/homeContent";
import type { Product } from "@/types/product";

type Props = {
  content: HomeContent;
  categories: StoreCategory[];
  products: Product[];
  error: string;
  isSaving: boolean;
  isUploading: boolean;
  children?: ReactNode;
  onSave: (content: HomeContent) => Promise<void>;
  onUploadImages: (files: File[]) => Promise<string[]>;
};

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToLines(value: string[]) {
  return value.join("\n");
}

export default function AdminHomeSection({
  content,
  categories,
  products,
  error,
  isSaving,
  isUploading,
  children,
  onSave,
  onUploadImages,
}: Props) {
  const [heroImagesText, setHeroImagesText] = useState(
    arrayToLines(content.heroImages)
  );
  const [socialLinks, setSocialLinks] = useState(
    content.socialLinks
  );
  const [categoryImages, setCategoryImages] = useState(
    content.categoryImages
  );
  const heroImages = linesToArray(heroImagesText);
  const visibleCategories = categories
    .filter((category) => category.active && category.value !== "curvas")
    .slice(0, 4);

  const saveContent = async () => {
    await onSave({
      ...content,
      heroImages,
      categoryImages,
      socialLinks,
    });
  };

  const getAutomaticCategoryImage = (categoryValue: string) => {
    const categoryProduct = products
      .filter((product) => product.category === categoryValue)
      .sort(
        (firstProduct, secondProduct) =>
          Number(secondProduct.featured) - Number(firstProduct.featured) ||
          secondProduct.id - firstProduct.id
      )[0];

    return categoryProduct ? getProductImage(categoryProduct) : null;
  };

  const resetCategoryImage = (categoryValue: string) => {
    setCategoryImages((current) => {
      const nextImages = { ...current };
      delete nextImages[categoryValue];
      return nextImages;
    });
  };

  const updateSocialLink = (
    field: keyof typeof socialLinks,
    value: string
  ) => {
    setSocialLinks((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const removeHeroImage = (imageToRemove: string) => {
    setHeroImagesText((current) =>
      arrayToLines(
        linesToArray(current).filter((image) => image !== imageToRemove)
      )
    );
  };

  const moveHeroImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= heroImages.length) return;

    const nextImages = [...heroImages];
    [nextImages[index], nextImages[nextIndex]] = [
      nextImages[nextIndex],
      nextImages[index],
    ];

    setHeroImagesText(arrayToLines(nextImages));
  };

  return (
    <div className="mx-auto mt-3 max-w-6xl px-3 pb-4 md:px-5">
      {error && (
        <div className="mb-3 border-l-4 border-yellow-400 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          {error}
        </div>
      )}

      <section className="border-b border-zinc-700 pb-4 pt-2">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-baseline gap-2">
            <h3 className="text-base font-black text-zinc-100">Hero</h3>
            <span className="text-xs font-semibold text-zinc-500">
              {heroImages.length} / 5
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                isSaving ||
                isUploading ||
                Boolean(error) ||
                heroImages.length >= 5
                  ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                  : "cursor-pointer border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Upload size={15} strokeWidth={2.5} />
              {isUploading ? (
                "Subiendo..."
              ) : (
                <>
                  <span className="sm:hidden">Agregar</span>
                  <span className="hidden sm:inline">Agregar imagen</span>
                </>
              )}

              <input
                type="file"
                multiple
                accept="image/*"
                disabled={
                  isSaving ||
                  isUploading ||
                  Boolean(error) ||
                  heroImages.length >= 5
                }
                onChange={async (event) => {
                  const availableSlots = Math.max(0, 5 - heroImages.length);
                  const files = Array.from(event.target.files || []).slice(
                    0,
                    availableSlots
                  );

                  if (files.length === 0) return;

                  const urls = await onUploadImages(files);

                  setHeroImagesText((current) =>
                    arrayToLines([...linesToArray(current), ...urls])
                  );

                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={saveContent}
              disabled={isSaving || isUploading || Boolean(error)}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} strokeWidth={2.5} />
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {heroImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {heroImages.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900"
              >
                <div className="relative h-24 bg-black">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
                    className="object-contain"
                  />

                  <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/75 px-1.5 text-xs font-black text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_1fr_40px] border-t border-zinc-700">
                  <button
                    type="button"
                    onClick={() => moveHeroImage(index, -1)}
                    disabled={index === 0 || isSaving || isUploading}
                    aria-label="Mover imagen a la izquierda"
                    title="Mover a la izquierda"
                    className="flex h-9 cursor-pointer items-center justify-center border-r border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveHeroImage(index, 1)}
                    disabled={
                      index === heroImages.length - 1 || isSaving || isUploading
                    }
                    aria-label="Mover imagen a la derecha"
                    title="Mover a la derecha"
                    className="flex h-9 cursor-pointer items-center justify-center border-r border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeHeroImage(image)}
                    disabled={isSaving || isUploading}
                    aria-label="Quitar imagen"
                    title="Quitar imagen"
                    className="flex h-9 cursor-pointer items-center justify-center text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
            Todavia no hay imagenes cargadas.
          </div>
        )}
      </section>

      <div className="grid items-start gap-3 py-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)]">
      <div className="grid min-w-0 gap-3">
      <section className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
        <div className="mb-3 flex items-baseline gap-2">
          <h3 className="text-base font-black text-zinc-100">
            Portadas de categorias
          </h3>
          <span className="text-xs font-semibold text-zinc-500">
            {visibleCategories.length}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {visibleCategories.map((category) => {
            const customImage = categoryImages[category.value];
            const previewImage =
              customImage || getAutomaticCategoryImage(category.value);

            return (
              <div
                key={category.value}
                className="grid min-h-[82px] grid-cols-[76px_minmax(0,1fr)] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900"
              >
                <div className="relative border-r border-zinc-700 bg-zinc-800">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt=""
                      fill
                      sizes="76px"
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl font-black text-zinc-600">
                      -
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-2 p-2.5">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-black text-white">
                      {category.label}
                    </span>

                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase ${
                        customImage ? "text-emerald-300" : "text-zinc-500"
                      }`}
                    >
                      {customImage ? "Personalizada" : "Automatica"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    {customImage && (
                      <button
                        type="button"
                        onClick={() => resetCategoryImage(category.value)}
                        disabled={isSaving || isUploading}
                        aria-label="Volver a imagen automatica"
                        title="Usar imagen automatica"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw size={15} strokeWidth={2.5} />
                      </button>
                    )}

                    <label
                      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold transition ${
                        isSaving || isUploading || Boolean(error)
                          ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                          : "cursor-pointer bg-white text-black hover:bg-zinc-200"
                      }`}
                    >
                      <Upload size={14} strokeWidth={2.5} />
                      Cambiar
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isSaving || isUploading || Boolean(error)}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;

                          const [url] = await onUploadImages([file]);

                          if (url) {
                            setCategoryImages((current) => ({
                              ...current,
                              [category.value]: url,
                            }));
                          }

                          event.target.value = "";
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {children}
      </div>

      <section className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
        <h3 className="mb-3 text-base font-black text-zinc-100">
          Contacto y redes
        </h3>

        <div className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)]">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              WhatsApp
            </span>
            <input
              type="text"
              value={socialLinks.whatsappNumber}
              onChange={(event) =>
                updateSocialLink("whatsappNumber", event.target.value)
              }
              disabled={isSaving}
              placeholder="5491164513813"
              className="h-10 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold outline-none transition focus:border-zinc-500 disabled:opacity-60"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Direccion showroom
            </span>
            <input
              type="text"
              value={socialLinks.showroomAddress}
              onChange={(event) =>
                updateSocialLink("showroomAddress", event.target.value)
              }
              disabled={isSaving}
              placeholder="Yerbal 3160 - Flores - CABA"
              className="h-10 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold outline-none transition focus:border-zinc-500 disabled:opacity-60"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2 border-t border-zinc-700 pt-3">
          {(
            [
              {
                name: "Instagram",
                urlField: "instagramUrl",
                labelField: "instagramLabel",
                placeholder: "@aivlis.ind",
              },
              {
                name: "Facebook",
                urlField: "facebookUrl",
                labelField: "facebookLabel",
                placeholder: "AIVLIS",
              },
              {
                name: "TikTok",
                urlField: "tiktokUrl",
                labelField: "tiktokLabel",
                placeholder: "@aivlis.ind",
              },
            ] as const
          ).map((socialNetwork) => (
            <div
              key={socialNetwork.name}
              className="grid gap-2 sm:grid-cols-[84px_minmax(0,1fr)_130px] sm:items-end"
            >
              <span className="flex h-10 items-center text-sm font-black text-zinc-200">
                {socialNetwork.name}
              </span>

              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase text-zinc-500">
                  URL
                </span>
                <input
                  type="url"
                  value={socialLinks[socialNetwork.urlField]}
                  onChange={(event) =>
                    updateSocialLink(
                      socialNetwork.urlField,
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  placeholder="https://..."
                  className="h-10 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none transition focus:border-zinc-500 disabled:opacity-60"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase text-zinc-500">
                  Nombre visible
                </span>
                <input
                  type="text"
                  value={socialLinks[socialNetwork.labelField]}
                  onChange={(event) =>
                    updateSocialLink(
                      socialNetwork.labelField,
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  placeholder={socialNetwork.placeholder}
                  className="h-10 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold outline-none transition focus:border-zinc-500 disabled:opacity-60"
                />
              </label>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
