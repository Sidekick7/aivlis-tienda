"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
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
    <div className="mx-auto mt-4 max-w-6xl rounded-3xl bg-zinc-900 p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black leading-none">
            Categorias
          </h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto] xl:w-[560px]">
          <input
            type="text"
            placeholder="Nueva categoria"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            className="h-10 min-w-0 rounded-xl bg-zinc-950 px-4 text-sm outline-none"
          />

          <button
            type="button"
            onClick={createNewCategory}
            disabled={isSaving || !newLabel.trim() || Boolean(error)}
            className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Crear
          </button>

          <button
            type="button"
            onClick={onNormalizeOrder}
            disabled={
              isSaving ||
              Boolean(error) ||
              categories.some((category) => !category.id)
            }
            className="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reparar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="hidden grid-cols-[72px_minmax(0,1fr)_92px_82px_142px] gap-3 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase text-zinc-500 lg:grid">
          <span>Orden</span>
          <span>Categoria</span>
          <span>Estado</span>
          <span>Prod.</span>
          <span className="text-right">Acciones</span>
        </div>

        <div className="divide-y divide-zinc-800">
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
              className="grid gap-3 px-4 py-3 lg:grid-cols-[72px_minmax(0,1fr)_92px_82px_142px] lg:items-center"
            >
              <div className="flex items-center gap-1 lg:block">
                <span className="flex h-8 min-w-9 items-center justify-center rounded-lg bg-zinc-900 px-2 text-sm font-semibold text-zinc-300">
                  {category.sortOrder}
                </span>

                <div className="flex gap-1 lg:mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!category.id || !previousCategory?.id) return;

                      onMove(
                        { ...category, id: category.id },
                        {
                          ...previousCategory,
                          id: previousCategory.id,
                        }
                      );
                    }}
                    disabled={!canMoveUp}
                    aria-label="Subir categoria"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowUp size={17} strokeWidth={3} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!category.id || !nextCategory?.id) return;

                      onMove(
                        { ...category, id: category.id },
                        {
                          ...nextCategory,
                          id: nextCategory.id,
                        }
                      );
                    }}
                    disabled={!canMoveDown}
                    aria-label="Bajar categoria"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowDown size={17} strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(150px,0.65fr)]">
                <label className="grid gap-1 lg:block">
                  <span className="text-xs font-semibold uppercase text-zinc-500 lg:hidden">
                    Nombre visible
                  </span>

                  <input
                    type="text"
                    value={draft.label}
                    disabled={!canMutate || isSaving}
                    onChange={(event) =>
                      updateDraft(category, {
                        label: event.target.value,
                      })
                    }
                    className="h-10 min-w-0 rounded-xl bg-zinc-900 px-3 text-sm font-semibold outline-none disabled:opacity-60"
                  />
                </label>

                <label className="grid gap-1 lg:block">
                  <span className="text-xs font-semibold uppercase text-zinc-500 lg:hidden">
                    Slug
                  </span>

                  <input
                    type="text"
                    value={draft.value}
                    disabled={!canMutate || isSaving}
                    onChange={(event) =>
                      updateDraft(category, {
                        value: slugifyCategoryValue(event.target.value),
                      })
                    }
                    className="h-10 min-w-0 rounded-xl bg-zinc-900 px-3 text-sm outline-none disabled:opacity-60"
                  />
                </label>
              </div>

              <label
                className={`inline-flex h-9 w-fit cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-semibold lg:w-full lg:justify-center ${
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
                    updateDraft(category, {
                      active: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-emerald-400"
                />
                {draft.active ? "Activa" : "Oculta"}
              </label>

              <span className="flex h-9 w-fit items-center justify-center rounded-full bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 lg:w-full">
                {productCount}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!canMutate || isSaving}
                  onClick={() => {
                    if (!category.id) return;

                    onUpdate({
                      ...draft,
                      id: category.id,
                    });
                  }}
                  className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Guardar
                </button>

                <button
                  type="button"
                  disabled={!canMutate || isSaving || productCount > 0}
                  onClick={() => {
                    if (!category.id) return;

                    onDelete({
                      ...category,
                      id: category.id,
                    });
                  }}
                  className="h-9 rounded-lg border border-red-500/30 px-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {productCount > 0 ? "Con productos" : "Eliminar"}
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
