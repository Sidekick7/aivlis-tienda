export { getProductImage } from "@/lib/productDisplay";
import type { Product } from "@/types/product";
import type { NewProductVariant } from "@/app/admin/adminTypes";

export const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function parseDetailsText(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDetailsText(details: string[]) {
  return details.join("\n");
}

export function slugifyProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductTotalStock(product: Product) {
  return product.variants.reduce(
    (total, variant) =>
      total +
      variant.sizes.reduce(
        (variantTotal, size) => variantTotal + size.stock,
        0
      ),
    0
  );
}

export function getVariantStock(variant: {
  sizes: { stock: string | number }[];
}) {
  return variant.sizes.reduce(
    (total, sizeItem) => total + Number(sizeItem.stock || 0),
    0
  );
}

export function createEmptyProductVariant(
  color = "Negro"
): NewProductVariant {
  return {
    color,
    hex: "#000000",
    sizes: [
      {
        size: "S",
        stock: "",
      },
    ],
    images: [],
  };
}
