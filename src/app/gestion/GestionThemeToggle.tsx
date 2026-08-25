"use client";

import { useEffect } from "react";

type GestionTone = "soft" | "light";

const storageKey = "aivlis-gestion-tone";

function applyTone(tone: GestionTone) {
  document
    .querySelector<HTMLElement>(".gestion-theme")
    ?.setAttribute("data-gestion-tone", tone);
}

export default function GestionThemeToggle() {
  useEffect(() => {
    const savedTone = window.localStorage.getItem(storageKey);
    const nextTone: GestionTone = savedTone === "light" ? "light" : "soft";

    applyTone(nextTone);
  }, []);

  const selectTone = (nextTone: GestionTone) => {
    applyTone(nextTone);
    window.localStorage.setItem(storageKey, nextTone);
  };

  return (
    <div
      className="fixed bottom-3 left-3 z-[70] hidden w-[166px] grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-lg lg:grid"
      aria-label="Tono de Gestion"
    >
      <button
        type="button"
        onClick={() => selectTone("soft")}
        className="gestion-tone-option gestion-tone-soft h-8 cursor-pointer rounded-lg text-xs font-bold transition"
      >
        Suave
      </button>
      <button
        type="button"
        onClick={() => selectTone("light")}
        className="gestion-tone-option gestion-tone-light h-8 cursor-pointer rounded-lg text-xs font-bold transition"
      >
        Claro
      </button>
    </div>
  );
}
