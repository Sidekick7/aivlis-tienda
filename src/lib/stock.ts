import type { ProductVariant } from "@/types/product";

type VariantWithSizes = Pick<ProductVariant, "color" | "sizes"> & {
  stock?: number;
};

export function findVariantSize({
  variants,
  color,
  size,
}: {
  variants?: VariantWithSizes[];
  color?: string | null;
  size?: string | null;
}) {
  if (!variants || variants.length === 0 || !color || !size) {
    return null;
  }

  const variantIndex = variants.findIndex(
    (variant) => variant.color === color
  );

  if (variantIndex < 0) return null;

  const variant = variants[variantIndex];
  const sizeIndex = variant.sizes.findIndex(
    (sizeItem) => sizeItem.size === size
  );

  if (sizeIndex < 0) return null;

  return {
    variant,
    variantIndex,
    sizeItem: variant.sizes[sizeIndex],
    sizeIndex,
  };
}

export function getVariantSizeStock({
  variants,
  color,
  size,
}: {
  variants?: VariantWithSizes[];
  color?: string | null;
  size?: string | null;
}) {
  return (
    findVariantSize({
      variants,
      color,
      size,
    })?.sizeItem.stock ?? 0
  );
}
