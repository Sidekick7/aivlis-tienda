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
  const [trustItemsText, setTrustItemsText] = useState(
    arrayToLines(content.trustItems)
  );
  const heroImages = linesToArray(heroImagesText);
  const trustItems = linesToArray(trustItemsText);

  const saveContent = async () => {
    await onSave({
      ...content,
      heroImages,
      trustItems,
    });
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

  const updateTrustItem = (index: number, value: string) => {
    const nextItems = [...trustItems];
    nextItems[index] = value;

    setTrustItemsText(arrayToLines(nextItems));
  };

  const addTrustItem = () => {
    setTrustItemsText((current) =>
      arrayToLines([...linesToArray(current), ""])
    );
  };

  const removeTrustItem = (indexToRemove: number) => {
    setTrustItemsText((current) =>
      arrayToLines(
        linesToArray(current).filter((_, index) => index !== indexToRemove)
      )
    );
  };

  return (
    <div className="mt-10 rounded-3xl bg-zinc-900 p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            Home
          </h2>

          <p className="mt-2 text-zinc-400">
            Editar imagenes del hero y mensajes informativos
          </p>
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

      <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl bg-zinc-950 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-300">
                  Imagenes del hero
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {heroImages.length} de 5 imagenes cargadas
                </p>
              </div>

              <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:opacity-90">
                {isUploading ? "Subiendo..." : "Subir imagenes"}

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

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {heroImages.map((image, index) => (
                <div
                  key={image}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                >
                  <div className="relative flex h-28 items-center justify-center bg-zinc-950">
                    <Image
                      src={image}
                      alt=""
                      width={160}
                      height={112}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="grid gap-2 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300">
                        {index + 1}
                      </span>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveHeroImage(index, -1)}
                          disabled={index === 0 || isSaving || isUploading}
                          className="h-7 w-7 rounded-lg bg-zinc-800 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="h-7 w-7 rounded-lg bg-zinc-800 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {">"}
                        </button>
                      </div>
                    </div>

                    <p className="truncate text-xs text-zinc-500">
                      {image}
                    </p>

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
              ))}
            </div>

            {heroImages.length === 0 && (
              <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">
                Todavia no hay imagenes cargadas.
              </p>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-400">
                Editar URLs manualmente
              </summary>

              <textarea
                value={heroImagesText}
                onChange={(event) =>
                  setHeroImagesText(event.target.value)
                }
                className="mt-3 min-h-32 w-full rounded-xl bg-zinc-900 p-4 text-sm outline-none"
              />
            </details>

            {isUploading && (
              <p className="mt-2 text-sm text-zinc-500">
                Subiendo imagenes...
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-zinc-950 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-300">
                  Bloque de confianza
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {trustItems.length} frases
                </p>
              </div>

              <button
                type="button"
                onClick={addTrustItem}
                disabled={isSaving}
                className="h-10 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar frase
              </button>
            </div>

            <div className="grid gap-2">
              {trustItems.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={item}
                    onChange={(event) =>
                      updateTrustItem(index, event.target.value)
                    }
                    disabled={isSaving}
                    className="h-11 min-w-0 flex-1 rounded-xl bg-zinc-900 px-4 text-sm outline-none disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => removeTrustItem(index)}
                    disabled={isSaving}
                    className="h-11 rounded-xl border border-red-500/30 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            {trustItems.length === 0 && (
              <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">
                Todavia no hay frases cargadas.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-zinc-950 p-5">
            <h3 className="text-xl font-bold">
              Links superiores
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Este espacio queda reservado para editar los botones del
              navbar, como Contacto, Local, Preguntas y Tienda.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-950 p-5">
            <h3 className="text-xl font-bold">
              Redes y contacto
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Aca vamos a conectar WhatsApp, Instagram, TikTok,
              direccion del local y horarios cuando pasemos esa
              informacion a Supabase.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 p-5 text-sm text-zinc-500">
            Los textos fijos de Home se conservan igual; por ahora no
            hace falta editarlos desde esta pantalla.
          </div>
        </div>
      </div>

    </div>
  );
}
