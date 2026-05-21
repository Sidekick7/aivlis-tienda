import { supabase } from "@/lib/supabase";
import {
  getVariantStock,
  parseDetailsText,
} from "@/app/admin/adminUtils";
import type {
  EditableProduct,
  NewProductVariant,
} from "@/app/admin/adminTypes";
import type { Product } from "@/types/product";

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
  productSku,
  productPrice,
  productRetailPrice,
  productCategory,
  productVariants,
}: {
  productName: string;
  productSlug: string;
  productSku: string;
  productPrice: string | number;
  productRetailPrice: string | number;
  productCategory: string;
  productVariants: ProductFormVariant[];
}) {
  const effectiveRetailPrice =
    String(productRetailPrice).trim() === ""
      ? productPrice
      : productRetailPrice;

  if (!productName.trim()) return "El nombre es obligatorio.";
  if (!productSlug.trim()) return "El slug es obligatorio.";
  if (!/^[A-Z0-9-]{3,6}$/.test(productSku)) {
    return "El codigo SKU debe tener entre 3 y 6 caracteres.";
  }
  if (!Number.isFinite(Number(productPrice)) || Number(productPrice) <= 0) {
    return "El precio mayorista debe ser mayor a 0.";
  }
  if (
    !Number.isFinite(Number(effectiveRetailPrice)) ||
    Number(effectiveRetailPrice) <= 0
  ) {
    return "El precio minorista debe ser mayor a 0.";
  }
  if (Number(effectiveRetailPrice) < Number(productPrice)) {
    return "El precio minorista no puede ser menor al mayorista.";
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
    if (error.message?.toLowerCase().includes("sku")) {
      return "Ya existe un producto con ese SKU.";
    }

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

export async function createAdminProduct({
  name,
  slug,
  sku,
  price,
  retailPrice,
  category,
  description,
  detailsText,
  variants,
}: {
  name: string;
  slug: string;
  sku: string;
  price: string;
  retailPrice: string;
  category: string;
  description: string;
  detailsText: string;
  variants: NewProductVariant[];
}) {
  const processedVariants = await prepareProductVariants(variants);

  const { error } = await supabase
    .from("products")
    .insert([
      {
        name,
        slug,
        sku,
        price: Number(price),
        retail_price: Number(retailPrice || price),
        category,
        description,
        stock: getProcessedVariantsStock(processedVariants),
        details: parseDetailsText(detailsText),
        featured: false,
        variants: processedVariants,
        images: processedVariants[0]?.images || [],
      },
    ]);

  if (error) {
    throw error;
  }
}

export async function updateAdminProduct({
  product,
  slug,
  detailsText,
}: {
  product: EditableProduct;
  slug: string;
  detailsText: string;
}) {
  const processedVariants = await prepareProductVariants(
    product.variants
  );

  const { error } = await supabase
    .from("products")
    .update({
      name: product.name,
      slug,
      sku: product.sku,
      price: Number(product.price),
      retail_price: Number(product.retailPrice || product.price),
      category: product.category,
      description: product.description,
      details: parseDetailsText(detailsText),
      stock: getProcessedVariantsStock(processedVariants),
      variants: processedVariants,
      images: processedVariants[0]?.images || [],
    })
    .eq("id", product.id);

  if (error) {
    throw error;
  }
}

export async function deleteAdminProduct(id: number) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateAdminProductFeatured(product: Product) {
  const { error } = await supabase
    .from("products")
    .update({
      featured: !product.featured,
    })
    .eq("id", product.id);

  if (error) {
    throw error;
  }
}

export async function updateAdminProductActive(product: Product) {
  const { error } = await supabase
    .from("products")
    .update({
      active: !product.active,
    })
    .eq("id", product.id);

  if (error) {
    throw error;
  }
}
