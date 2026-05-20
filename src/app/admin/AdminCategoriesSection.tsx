"use client";

import { useMemo, useState } from "react";
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
    <div className="mt-10 rounded-3xl bg-zinc-900 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            Categorias
          </h2>

          <p className="mt-2 text-zinc-400">
            Administrar filtros, navbar, tienda y Home
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Nueva categoria"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            className="h-11 rounded-xl bg-zinc-950 px-4 outline-none"
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
        {sortedCategories.map((category) => {
          const draft = getDraft(category);
          const productCount = getCategoryProductCount(
            products,
            category.value
          );
          const canMutate = Boolean(category.id) && !error;

          return (
            <div
              key={category.id ?? category.value}
              className="grid gap-3 rounded-2xl bg-zinc-800 p-4 lg:grid-cols-[1fr_1fr_110px_110px_220px] lg:items-center"
            >
              <input
                type="text"
                value={draft.label}
                disabled={!canMutate || isSaving}
                onChange={(event) =>
                  updateDraft(category, {
                    label: event.target.value,
                  })
                }
                className="h-11 rounded-xl bg-zinc-950 px-4 outline-none disabled:opacity-60"
              />

              <input
                type="text"
                value={draft.value}
                disabled={!canMutate || isSaving}
                onChange={(event) =>
                  updateDraft(category, {
                    value: slugifyCategoryValue(event.target.value),
                  })
                }
                className="h-11 rounded-xl bg-zinc-950 px-4 outline-none disabled:opacity-60"
              />

              <input
                type="number"
                value={draft.sortOrder}
                disabled={!canMutate || isSaving}
                onChange={(event) =>
                  updateDraft(category, {
                    sortOrder: Number(event.target.value),
                  })
                }
                className="h-11 rounded-xl bg-zinc-950 px-4 outline-none disabled:opacity-60"
              />

              <label className="flex items-center gap-2 text-sm text-zinc-300">
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

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <span className="text-sm text-zinc-500">
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
                  className="text-blue-400 transition hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
