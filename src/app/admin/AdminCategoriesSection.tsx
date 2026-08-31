"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import {
  slugifyCategoryValue,
} from "@/lib/categories";
import type { StoreCategory } from "@/types/category";
import type { Product } from "@/types/product";

type DraftCategory = StoreCategory & {
  id?: number;
};

type Props = {
  categories: StoreCategory[];
  products: Product[];
  error: string;
  isSaving: boolean;
  onCreate: (category: Omit<StoreCategory, "id">) => Promise<void>;
  onUpdate: (category: StoreCategory & { id: number }) => Promise<void>;
  onMove: (
    category: StoreCategory & { id: number },
    targetCategory: StoreCategory & { id: number }
  ) => Promise<void>;
  onNormalizeOrder: () => Promise<void>;
  onDelete: (category: StoreCategory & { id: number }) => Promise<void>;
};

function getCategoryProductCount(
  products: Product[],
  categoryValue: string
) {
  return products.filter(
    (product) => product.category === categoryValue
  ).length;
}

export default function AdminCategoriesSection({
  categories,
  products,
  error,
  isSaving,
  onCreate,
  onUpdate,
  onMove,
  onNormalizeOrder,
  onDelete,
}: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, DraftCategory>
  >({});
  const nextSortOrder =
    Math.max(0, ...categories.map((category) => category.sortOrder)) +
    1;
  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
      ),
    [categories]
  );

  const getDraft = (category: StoreCategory) => {
    const key = String(category.id ?? category.value);

    return drafts[key] ?? category;
  };

  const updateDraft = (
    category: StoreCategory,
    updates: Partial<DraftCategory>
  ) => {
    const key = String(category.id ?? category.value);

    setDrafts((current) => ({
      ...current,
      [key]: {
        ...getDraft(category),
        ...updates,
      },
    }));
  };

  const createNewCategory = async () => {
    const label = newLabel.trim();

    if (!label) return;

    await onCreate({
      label,
      value: slugifyCategoryValue(label),
      sortOrder: nextSortOrder,
      active: true,
    });

    setNewLabel("");
  };

  return (
    <section className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-black text-zinc-100">Categorias</h3>
          <span className="text-xs font-semibold text-zinc-500">
            {sortedCategories.length}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <input
            type="text"
            placeholder="Nueva categoria"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            className="h-8 w-40 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 text-xs outline-none transition focus:border-zinc-500"
          />

          <button
            type="button"
            onClick={createNewCategory}
            disabled={isSaving || !newLabel.trim() || Boolean(error)}
            aria-label="Crear categoria"
            title="Crear categoria"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={onNormalizeOrder}
            disabled={
              isSaving ||
              Boolean(error) ||
              categories.some((category) => !category.id)
            }
            aria-label="Reparar orden"
            title="Reparar orden"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2 border-l-4 border-yellow-400 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
          {error}
        </div>
      )}

      <div className="divide-y divide-zinc-700 border-y border-zinc-700">
        {sortedCategories.map((category, index) => {
          const draft = getDraft(category);
          const previousCategory = sortedCategories[index - 1];
          const nextCategory = sortedCategories[index + 1];
          const productCount = getCategoryProductCount(
            products,
            category.value
          );
          const canMutate = Boolean(category.id) && !error;
          const canMoveUp =
            canMutate && Boolean(previousCategory?.id) && !isSaving;
          const canMoveDown =
            canMutate && Boolean(nextCategory?.id) && !isSaving;

          return (
            <div
              key={category.id ?? category.value}
              className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2 py-2 sm:grid-cols-[84px_minmax(130px,1fr)_78px_42px_72px]"
            >
              <div className="flex items-center gap-1">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-zinc-950 px-1 text-xs font-semibold text-zinc-300">
                  {category.sortOrder}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (!category.id || !previousCategory?.id) return;

                    onMove(
                      { ...category, id: category.id },
                      { ...previousCategory, id: previousCategory.id }
                    );
                  }}
                  disabled={!canMoveUp}
                  aria-label="Subir categoria"
                  title="Subir categoria"
                  className="flex h-7 w-6 cursor-pointer items-center justify-center rounded-md text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp size={15} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!category.id || !nextCategory?.id) return;

                    onMove(
                      { ...category, id: category.id },
                      { ...nextCategory, id: nextCategory.id }
                    );
                  }}
                  disabled={!canMoveDown}
                  aria-label="Bajar categoria"
                  title="Bajar categoria"
                  className="flex h-7 w-6 cursor-pointer items-center justify-center rounded-md text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown size={15} strokeWidth={2.5} />
                </button>
              </div>

              <input
                type="text"
                value={draft.label}
                disabled={!canMutate || isSaving}
                onChange={(event) =>
                  updateDraft(category, { label: event.target.value })
                }
                aria-label={`Nombre de ${category.label}`}
                className="h-8 min-w-0 rounded-md bg-zinc-950 px-2.5 text-xs font-semibold outline-none transition focus:ring-1 focus:ring-zinc-500 disabled:opacity-60"
              />

              <label
                className={`inline-flex h-7 w-fit cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold sm:w-full ${
                  draft.active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={draft.active}
                  disabled={!canMutate || isSaving}
                  onChange={(event) =>
                    updateDraft(category, { active: event.target.checked })
                  }
                  className="h-3.5 w-3.5 accent-emerald-400"
                />
                {draft.active ? "Activa" : "Oculta"}
              </label>

              <span
                title={`${productCount} productos`}
                className="flex h-7 w-9 items-center justify-center rounded-full bg-zinc-950 text-[11px] font-semibold text-zinc-300"
              >
                {productCount}
              </span>

              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  disabled={!canMutate || isSaving}
                  onClick={() => {
                    if (!category.id) return;
                    onUpdate({ ...draft, id: category.id });
                  }}
                  aria-label="Guardar categoria"
                  title="Guardar categoria"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save size={15} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  disabled={!canMutate || isSaving || productCount > 0}
                  onClick={() => {
                    if (!category.id) return;
                    onDelete({ ...category, id: category.id });
                  }}
                  aria-label={
                    productCount > 0
                      ? "La categoria tiene productos"
                      : "Eliminar categoria"
                  }
                  title={
                    productCount > 0
                      ? "La categoria tiene productos"
                      : "Eliminar categoria"
                  }
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
