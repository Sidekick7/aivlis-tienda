"use client";

import Image from "next/image";
import { useState } from "react";
import type { HomeContent } from "@/types/homeContent";

type Props = {
  content: HomeContent;
  error: string;
  isSaving: boolean;
  isUploading: boolean;
  onSave: (content: HomeContent) => Promise<void>;
  onUploadHeroImages: (files: File[]) => Promise<string[]>;
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
  error,
  isSaving,
  isUploading,
  onSave,
  onUploadHeroImages,
}: Props) {
  const [heroImagesText, setHeroImagesText] = useState(
    arrayToLines(content.heroImages)
  );
  const [socialLinks, setSocialLinks] = useState(
    content.socialLinks
  );
  const heroImages = linesToArray(heroImagesText);

  const saveContent = async () => {
    await onSave({
      ...content,
      heroImages,
      socialLinks,
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
    <div className="mx-auto mt-4 max-w-6xl rounded-3xl bg-zinc-900 p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black leading-none">
            Home
          </h2>
        </div>

        <button
          type="button"
          onClick={saveContent}
          disabled={isSaving || isUploading || Boolean(error)}
          className="h-12 rounded-xl bg-white px-6 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Guardar Home"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl bg-zinc-950 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <p className="text-base font-black text-zinc-100">
                  Hero
                </p>

                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {heroImages.length}/5
                </span>
              </div>

              <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:opacity-90">
                {isUploading ? "Subiendo..." : "Agregar imagen"}

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isSaving || isUploading || Boolean(error)}
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);

                    if (files.length === 0) return;

                    const urls = await onUploadHeroImages(files);

                    setHeroImagesText((current) =>
                      arrayToLines([...linesToArray(current), ...urls])
                    );

                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {heroImages.map((image, index) => (
                <div
                  key={image}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  <div className="relative flex h-36 items-center justify-center bg-zinc-950">
                    <Image
                      src={image}
                      alt=""
                      width={220}
                      height={150}
                      className="h-full w-full object-contain"
                    />

                    <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-black text-white">
                        {index + 1}
                      </span>
                  </div>

                  <div className="grid gap-2 p-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-1">
                        <button
                          type="button"
                          onClick={() => moveHeroImage(index, -1)}
                          disabled={index === 0 || isSaving || isUploading}
                          aria-label="Mover imagen a la izquierda"
                          className="h-8 rounded-lg bg-zinc-800 text-base font-black leading-none text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {"<"}
                        </button>

                        <button
                          type="button"
                          onClick={() => moveHeroImage(index, 1)}
                          disabled={
                            index === heroImages.length - 1 ||
                            isSaving ||
                            isUploading
                          }
                          aria-label="Mover imagen a la derecha"
                          className="h-8 rounded-lg bg-zinc-800 text-base font-black leading-none text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {">"}
                        </button>

                    <button
                      type="button"
                      onClick={() => removeHeroImage(image)}
                      disabled={isSaving || isUploading}
                      className="h-8 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Quitar
                    </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {heroImages.length === 0 && (
              <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">
                Todavia no hay imagenes cargadas.
              </p>
            )}

            {isUploading && (
              <p className="mt-2 text-sm text-zinc-500">
                Subiendo imagenes...
              </p>
            )}
        </section>

        <section className="grid content-start gap-4 rounded-2xl bg-zinc-950 p-4">
          <p className="text-base font-black text-zinc-100">
            Redes y contacto
          </p>

          <div className="grid gap-3 rounded-2xl border border-zinc-800 p-3">
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
              className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold outline-none disabled:opacity-60"
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
              className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold outline-none disabled:opacity-60"
            />
          </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-zinc-800 p-3">
            <div className="grid grid-cols-[88px_minmax(0,1fr)_128px] gap-2 text-xs font-semibold uppercase text-zinc-500">
              <span>Red</span>
              <span>URL</span>
              <span>Visible</span>
            </div>

            <div className="grid grid-cols-[88px_minmax(0,1fr)_128px] items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">
                Instagram
              </span>
              <input
                type="url"
                value={socialLinks.instagramUrl}
                onChange={(event) =>
                  updateSocialLink("instagramUrl", event.target.value)
                }
                disabled={isSaving}
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm outline-none disabled:opacity-60"
              />
              <input
                type="text"
                value={socialLinks.instagramLabel}
                onChange={(event) =>
                  updateSocialLink("instagramLabel", event.target.value)
                }
                disabled={isSaving}
                placeholder="@aivlis.ind"
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold outline-none disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-[88px_minmax(0,1fr)_128px] items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">
                Facebook
              </span>
              <input
                type="url"
                value={socialLinks.facebookUrl}
                onChange={(event) =>
                  updateSocialLink("facebookUrl", event.target.value)
                }
                disabled={isSaving}
                placeholder="https://www.facebook.com/..."
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm outline-none disabled:opacity-60"
              />
              <input
                type="text"
                value={socialLinks.facebookLabel}
                onChange={(event) =>
                  updateSocialLink("facebookLabel", event.target.value)
                }
                disabled={isSaving}
                placeholder="AIVLIS"
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold outline-none disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-[88px_minmax(0,1fr)_128px] items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">
                TikTok
              </span>
              <input
                type="url"
                value={socialLinks.tiktokUrl}
                onChange={(event) =>
                  updateSocialLink("tiktokUrl", event.target.value)
                }
                disabled={isSaving}
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm outline-none disabled:opacity-60"
              />
              <input
                type="text"
                value={socialLinks.tiktokLabel}
                onChange={(event) =>
                  updateSocialLink("tiktokLabel", event.target.value)
                }
                disabled={isSaving}
                placeholder="@aivlis.ind"
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
