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
  retailPrice: number;
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
  retail_price?: number | string | null;
  sale_mode?: unknown;
};
