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
    <div className="mt-8 rounded-3xl bg-zinc-900 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            Categorias de catalogo
          </h2>

          <p className="mt-2 text-zinc-400">
            Administrar filtros y orden de categorias visibles.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <button
            type="button"
            onClick={onNormalizeOrder}
            disabled={
              isSaving ||
              Boolean(error) ||
              categories.some((category) => !category.id)
            }
            className="h-11 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reparar orden
          </button>

          <input
            type="text"
            placeholder="Nueva categoria"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            className="h-11 min-w-0 rounded-xl bg-zinc-950 px-4 outline-none sm:w-64"
          />

          <button
            type="button"
            onClick={createNewCategory}
            disabled={isSaving || !newLabel.trim() || Boolean(error)}
            className="h-11 rounded-xl bg-white px-5 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Crear
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
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
              className="grid gap-4 rounded-2xl bg-zinc-800 p-4 2xl:grid-cols-[minmax(0,720px)_auto] 2xl:items-center"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(180px,240px)_minmax(160px,220px)_132px_112px] lg:items-end">
                <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
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
                    className="h-11 min-w-0 rounded-xl bg-zinc-950 px-4 text-base font-semibold outline-none disabled:opacity-60"
                    />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase text-zinc-500">
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
                    className="h-11 min-w-0 rounded-xl bg-zinc-950 px-4 text-sm outline-none disabled:opacity-60"
                  />
                </label>

                <div className="grid gap-1">
                  <span className="text-xs font-semibold uppercase text-zinc-500">
                    Orden
                  </span>

                  <div className="flex h-11 items-center rounded-xl bg-zinc-950 p-1">
                    <span className="flex h-full min-w-10 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-semibold text-zinc-300">
                      {category.sortOrder}
                    </span>

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
                      className="ml-auto flex h-full w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ArrowUp size={18} strokeWidth={3} />
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
                      className="flex h-full w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ArrowDown size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <label className="flex h-11 w-fit items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-300 lg:w-full lg:justify-center">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    disabled={!canMutate || isSaving}
                    onChange={(event) =>
                      updateDraft(category, {
                        active: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-white"
                  />
                  Activa
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(130px,1fr)_96px_118px] 2xl:w-[360px]">
                <span className="flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm text-zinc-300">
                  {productCount} productos
                </span>

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
                  className="h-10 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="h-10 rounded-lg border border-red-500/30 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {productCount > 0 ? "Con productos" : "Eliminar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
