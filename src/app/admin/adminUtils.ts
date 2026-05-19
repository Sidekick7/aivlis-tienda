import { fallbackProductImage } from "@/config/store";
import type { Product } from "@/types/product";

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

export function getProductImage(product: Product) {
  return (
    product.images[0] ||
    product.variants.find((variant) => variant.images.length > 0)
      ?.images[0] ||
    fallbackProductImage
  );
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
