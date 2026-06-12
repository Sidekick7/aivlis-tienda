import type { CartItem } from "@/context/CartContext";
import type { Product, ProductVariant } from "@/types/product";

export function isCurveProduct(
  product: Pick<Product, "saleMode">
) {
  return product.saleMode === "curve";
}

export function getCurveSizesFromVariant(variant?: ProductVariant) {
  return variant?.sizes.map((sizeItem) => sizeItem.size) ?? [];
}

export function getCurveUnitsPerSet(variant?: ProductVariant) {
  return getCurveSizesFromVariant(variant).length;
}

export function getCurveLabel(variant?: ProductVariant) {
  const sizes = getCurveSizesFromVariant(variant);

  return sizes.length > 0 ? `Curva ${sizes.join(" / ")}` : "Curva";
}

export function getCurveStockLimit({
  variant,
}: {
  variant?: ProductVariant;
}) {
  const curveSizes = getCurveSizesFromVariant(variant);

  if (!variant || curveSizes.length === 0) return 0;

  return Math.min(
    ...curveSizes.map((size) => {
      const stock = variant.sizes.find(
        (sizeItem) => sizeItem.size === size
      )?.stock;

      return stock ?? 0;
    })
  );
}

export function getCartItemUnits(item: CartItem) {
  if (!isCurveProduct(item)) return item.quantity;

  const variant = item.variants?.find(
    (productVariant) => productVariant.color === item.selectedColor
  );

  return getCurveUnitsPerSet(variant) * item.quantity;
}
