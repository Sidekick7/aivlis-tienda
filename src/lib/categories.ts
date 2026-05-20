import { categories as fallbackCategories } from "@/config/store";
import { supabase } from "@/lib/supabase";
import type {
  StoreCategory,
  SupabaseCategoryRow,
} from "@/types/category";

function normalizeCategory(row: SupabaseCategoryRow): StoreCategory {
  return {
    id: row.id,
    label: row.label ?? "",
    value: row.value ?? "",
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active ?? true,
  };
}

export function slugifyCategoryValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getFallbackCategories(): StoreCategory[] {
  return fallbackCategories.map((category, index) => ({
    ...category,
    sortOrder: index + 1,
    active: true,
  }));
}

export async function getCategories({
  includeInactive = false,
  fallbackToStatic = true,
}: {
  includeInactive?: boolean;
  fallbackToStatic?: boolean;
} = {}): Promise<StoreCategory[]> {
  let query = supabase
    .from("categories")
    .select("id,label,value,sort_order,active")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    if (fallbackToStatic) return getFallbackCategories();

    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeCategory(row as SupabaseCategoryRow)
  );
}

export async function createCategory({
  label,
  value,
  sortOrder,
  active,
}: {
  label: string;
  value: string;
  sortOrder: number;
  active: boolean;
}) {
  const { error } = await supabase.from("categories").insert([
    {
      label,
      value,
      sort_order: sortOrder,
      active,
    },
  ]);

  if (error) throw error;
}

export async function updateCategory({
  id,
  label,
  value,
  sortOrder,
  active,
}: StoreCategory & { id: number }) {
  const { error } = await supabase
    .from("categories")
    .update({
      label,
      value,
      sort_order: sortOrder,
      active,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCategory(id: number) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
