import { fallbackProductImage } from "@/config/store";
import type { Product } from "@/types/product";

export function getProductImage(product: Product) {
  return (
    product.images[0] ||
    product.variants.find((variant) => variant.images.length > 0)
      ?.images[0] ||
    fallbackProductImage
  );
}
