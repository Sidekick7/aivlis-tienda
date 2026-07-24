export type ProductVariantSize = {
  size: string;
  stock: number;
};

export type ProductVariant = {
  color: string;
  hex: string;
  stock?: number;
  sizes: ProductVariantSize[];
  images: string[];
};

export type ProductSaleMode = "unit" | "curve";

export type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  curvePrice: number;
  retailPrice: number;
  saleActive: boolean;
  salePrice: number;
  saleCurvePrice: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  cost: number;
  saleMode: ProductSaleMode;
  category: string;
  description: string;
  sku?: string;
  details: string[];
  featured: boolean;
  active: boolean;
  images: string[];
  stock?: number;
  variants: ProductVariant[];
};

export type SupabaseProductRow = Partial<
  Omit<Product, "variants" | "details" | "featured" | "images">
> & {
  id: number;
  variants?: unknown;
  details?: unknown;
  featured?: boolean | null;
  active?: boolean | null;
  images?: unknown;
  sizes?: unknown;
  stock?: number | null;
  cost?: number | string | null;
  curve_price?: number | string | null;
  retail_price?: number | string | null;
  sale_active?: boolean | null;
  sale_price?: number | string | null;
  sale_curve_price?: number | string | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  sale_mode?: unknown;
};
