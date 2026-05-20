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

  const saveContent = async () => {
    await onSave({
      ...content,
      heroImages: linesToArray(heroImagesText),
      trustItems: linesToArray(trustItemsText),
    });
  };

  return (
    <div className="mt-10 rounded-3xl bg-zinc-900 p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">
          Home
        </h2>

        <p className="mt-2 text-zinc-400">
          Editar imagenes del hero y mensajes informativos
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-300">
              Imagenes del hero
            </p>

            <textarea
              value={heroImagesText}
              onChange={(event) =>
                setHeroImagesText(event.target.value)
              }
              className="min-h-40 w-full rounded-xl bg-zinc-950 p-4 text-sm outline-none"
            />

            <label className="mt-3 block">
              <span className="mb-2 block text-sm text-zinc-400">
                Subir imagenes
              </span>

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
                className="text-sm text-zinc-400"
              />
            </label>

            {isUploading && (
              <p className="mt-2 text-sm text-zinc-500">
                Subiendo imagenes...
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-300">
              Bloque de confianza
            </p>

            <textarea
              value={trustItemsText}
              onChange={(event) =>
                setTrustItemsText(event.target.value)
              }
              className="min-h-32 w-full rounded-xl bg-zinc-950 p-4 text-sm outline-none"
            />
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

      <div className="mt-8">
        <p className="mb-3 text-sm font-semibold text-zinc-300">
          Preview hero
        </p>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {linesToArray(heroImagesText).map((image) => (
            <div
              key={image}
              className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950"
            >
              <Image
                src={image}
                alt=""
                width={96}
                height={128}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={saveContent}
        disabled={isSaving || isUploading || Boolean(error)}
        className="mt-8 h-12 rounded-xl bg-white px-6 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Guardando..." : "Guardar Home"}
      </button>
    </div>
  );
}
