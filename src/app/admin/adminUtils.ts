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

export const skuPrefix = "AIV-";

export function normalizeSkuCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 6);
}

export function getSkuCode(sku?: string | null) {
  const normalizedSku = (sku || "").toUpperCase();

  return normalizeSkuCode(
    normalizedSku.startsWith(skuPrefix)
      ? normalizedSku.slice(skuPrefix.length)
      : normalizedSku
  );
}

export function formatSku(code: string) {
  return `${skuPrefix}${normalizeSkuCode(code)}`;
}

export function getNextSku(products: { sku?: string | null }[]) {
  const usedCodes = new Set(products.map((product) => getSkuCode(product.sku)));
  let nextNumber = 1;

  while (usedCodes.has(String(nextNumber).padStart(6, "0"))) {
    nextNumber += 1;
  }

  return formatSku(String(nextNumber).padStart(6, "0"));
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
