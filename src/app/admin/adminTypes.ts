import type {
  Product,
  ProductVariantSize,
} from "@/types/product";

export type NewProductVariant = {
  color: string;
  hex: string;
  sizes: {
    size: string;
    stock: string;
  }[];
  images: File[];
};

export type EditableVariant = {
  color: string;
  hex: string;
  sizes: ProductVariantSize[];
  images: (string | File)[];
};

export type EditableProduct = Omit<
  Product,
  "price" | "retailPrice" | "cost" | "variants"
> & {
  price: number | string;
  retailPrice: number | string;
  cost: number | string;
  variants: EditableVariant[];
};

export type AdminSection =
  | "products"
  | "home";

export type ProductFilter =
  | "all"
  | "active"
  | "inactive";
