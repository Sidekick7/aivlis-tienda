import { supabase } from "@/lib/supabase";
import { storeConfig } from "@/config/store";
import type {
  Product,
  ProductVariant,
  ProductVariantSize,
  SupabaseProductRow,
} from "@/types/product";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeSize(
  value: unknown,
  fallbackStock: number
): ProductVariantSize | null {
  if (typeof value === "string") {
    return {
      size: value,
      stock: fallbackStock,
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as {
    size?: unknown;
    stock?: unknown;
  };

  if (typeof item.size !== "string") {
    return null;
  }

  return {
    size: item.size,
    stock: Number(item.stock ?? fallbackStock),
  };
}

function normalizeVariant(value: unknown): ProductVariant | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const variant = value as {
    color?: unknown;
    hex?: unknown;
    stock?: unknown;
    sizes?: unknown;
    images?: unknown;
  };

  const fallbackStock = Number(variant.stock ?? 0);
  const sizes = Array.isArray(variant.sizes)
    ? variant.sizes
        .map((size) => normalizeSize(size, fallbackStock))
        .filter((size): size is ProductVariantSize => Boolean(size))
    : [];
  const stock = sizes.reduce(
    (total, size) => total + size.stock,
    0
  );

  return {
    color: typeof variant.color === "string" ? variant.color : "",
    hex: typeof variant.hex === "string" ? variant.hex : "#000000",
    stock,
    sizes,
    images: toStringArray(variant.images),
  };
}

export function normalizeProduct(row: SupabaseProductRow): Product {
  const variants = Array.isArray(row.variants)
    ? row.variants
        .map(normalizeVariant)
        .filter((variant): variant is ProductVariant => Boolean(variant))
    : [];

  const stock = variants.reduce(
    (total, variant) => total + (variant.stock ?? 0),
    0
  );

  return {
    id: row.id,
    slug: row.slug ?? "",
    name: row.name ?? "",
    price: Number(row.price ?? 0),
    category: row.category ?? "",
    description: row.description ?? "",
    sku: row.sku,
    minimum: Number(row.minimum ?? storeConfig.defaultMinimumQuantity),
    details: toStringArray(row.details),
    featured: Boolean(row.featured),
    images: toStringArray(row.images),
    stock,
    variants,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeProduct(row as SupabaseProductRow)
  );
}

export async function getProductsByCategory(
  category: string
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", category);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeProduct(row as SupabaseProductRow)
  );
}

export async function getProductBySlug(
  slug: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .order("id", { ascending: true })
    .limit(1);

  if (error) {
    return null;
  }

  const product = data?.[0];

  return product
    ? normalizeProduct(product as SupabaseProductRow)
    : null;
}

export async function getProductsByIds(
  productIds: number[]
): Promise<Product[]> {
  if (productIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeProduct(row as SupabaseProductRow)
  );
}
