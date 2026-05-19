import { supabase } from "@/lib/supabase";
import { getVariantStock } from "@/app/admin/adminUtils";

export type ProductFormVariant = {
  color: string;
  hex: string;
  sizes: {
    size: string;
    stock: string | number;
  }[];
  images: (string | File)[];
};

export type ProcessedProductVariant = {
  color: string;
  hex: string;
  stock: number;
  sizes: {
    size: string;
    stock: number;
  }[];
  images: string[];
};

export function getProductFormError({
  productName,
  productSlug,
  productPrice,
  productCategory,
  productVariants,
}: {
  productName: string;
  productSlug: string;
  productPrice: string | number;
  productCategory: string;
  productVariants: ProductFormVariant[];
}) {
  if (!productName.trim()) return "El nombre es obligatorio.";
  if (!productSlug.trim()) return "El slug es obligatorio.";
  if (!Number.isFinite(Number(productPrice)) || Number(productPrice) <= 0) {
    return "El precio debe ser mayor a 0.";
  }
  if (!productCategory.trim()) return "La categoria es obligatoria.";
  if (productVariants.length === 0) {
    return "Agrega al menos un color.";
  }

  for (const variant of productVariants) {
    if (!variant.color.trim()) return "Cada color necesita un nombre.";
    if (variant.sizes.length === 0) {
      return `Agrega al menos un talle para ${variant.color}.`;
    }

    for (const sizeItem of variant.sizes) {
      if (!sizeItem.size.trim()) return "Cada talle necesita un nombre.";

      const stock = Number(sizeItem.stock);

      if (!Number.isInteger(stock) || stock < 0) {
        return `El stock de ${sizeItem.size} debe ser 0 o mayor.`;
      }
    }
  }

  return "";
}

export function getProductMutationError(error: {
  code?: string;
  message?: string;
}) {
  if (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("duplicate")
  ) {
    return "Ya existe un producto con ese slug.";
  }

  return error.message || "No se pudo guardar el producto.";
}

async function uploadProductImage(file: File) {
  const fileName = `${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from("products")
    .upload(fileName, file);

  if (error) {
    throw new Error(`No se pudo subir una imagen: ${error.message}`);
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${fileName}`;
}

export async function prepareProductVariants(
  variants: ProductFormVariant[]
): Promise<ProcessedProductVariant[]> {
  const processedVariants: ProcessedProductVariant[] = [];

  for (const variant of variants) {
    const imageUrls: string[] = [];

    for (const image of variant.images) {
      if (typeof image === "string") {
        imageUrls.push(image);
        continue;
      }

      imageUrls.push(await uploadProductImage(image));
    }

    processedVariants.push({
      color: variant.color,
      hex: variant.hex,
      stock: getVariantStock(variant),
      sizes: variant.sizes.map((sizeItem) => ({
        size: sizeItem.size,
        stock: Number(sizeItem.stock),
      })),
      images: imageUrls,
    });
  }

  return processedVariants;
}

export function getProcessedVariantsStock(
  variants: ProcessedProductVariant[]
) {
  return variants.reduce(
    (total, variant) => total + variant.stock,
    0
  );
}
