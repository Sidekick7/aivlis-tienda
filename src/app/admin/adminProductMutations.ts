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
  productCurvePrice,
  productRetailPrice,
  productCost,
  productSaleActive = false,
  productSalePrice = 0,
  productSaleCurvePrice = 0,
  productSaleStartsAt,
  productSaleEndsAt,
  productCategory,
  productVariants,
  productSaleMode = "unit",
}: {
  productName: string;
  productSlug: string;
  productSku: string;
  productPrice: string | number;
  productCurvePrice?: string | number;
  productRetailPrice: string | number;
  productCost: string | number;
  productSaleActive?: boolean;
  productSalePrice?: string | number;
  productSaleCurvePrice?: string | number;
  productSaleStartsAt?: string | null;
  productSaleEndsAt?: string | null;
  productCategory: string;
  productVariants: ProductFormVariant[];
  productSaleMode?: Product["saleMode"];
}) {
  const effectiveRetailPrice =
    String(productRetailPrice).trim() === ""
      ? productPrice
      : productRetailPrice;
  const effectiveCurvePrice =
    String(productCurvePrice ?? "").trim() === ""
      ? productPrice
      : productCurvePrice;

  if (!productName.trim()) return "El nombre es obligatorio.";
  if (!productSlug.trim()) return "El slug es obligatorio.";
  if (!/^[A-Z0-9-]{3,6}$/.test(productSku)) {
    return "El codigo SKU debe tener entre 3 y 6 caracteres.";
  }
  if (!Number.isFinite(Number(productPrice)) || Number(productPrice) <= 0) {
    return "El precio mayorista debe ser mayor a 0.";
  }
  if (
    !Number.isFinite(Number(effectiveCurvePrice)) ||
    Number(effectiveCurvePrice) <= 0
  ) {
    return "El precio curva debe ser mayor a 0.";
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
  if (
    String(productCost).trim() === "" ||
    !Number.isFinite(Number(productCost)) ||
    Number(productCost) < 0
  ) {
    return "El costo debe ser 0 o mayor.";
  }
  if (productSaleActive) {
    const salePrice = Number(productSalePrice || 0);
    const saleCurvePrice = Number(productSaleCurvePrice || 0);
    const hasUnitSale = salePrice > 0;
    const hasCurveSale =
      productSaleMode === "curve" && saleCurvePrice > 0;

    if (!hasUnitSale && !hasCurveSale) {
      return "Ingresa al menos un precio SALE.";
    }

    if (hasUnitSale && salePrice >= Number(productPrice)) {
      return "El precio SALE debe ser menor al precio mayorista.";
    }

    if (
      hasCurveSale &&
      saleCurvePrice >= Number(effectiveCurvePrice)
    ) {
      return "El precio SALE curva debe ser menor al precio curva.";
    }

    const startsAt = productSaleStartsAt
      ? new Date(productSaleStartsAt)
      : null;
    const endsAt = productSaleEndsAt
      ? new Date(productSaleEndsAt)
      : null;

    if (
      startsAt &&
      endsAt &&
      startsAt.getTime() >= endsAt.getTime()
    ) {
      return "La fecha de fin de SALE debe ser posterior al inicio.";
    }
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

    if (productSaleMode === "curve" && variant.sizes.length < 2) {
      return `El color ${variant.color} necesita al menos 2 talles para vender por curva.`;
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
  curvePrice,
  retailPrice,
  cost,
  category,
  description,
  detailsText,
  variants,
  saleMode,
}: {
  name: string;
  slug: string;
  sku: string;
  price: string;
  curvePrice: string;
  retailPrice: string;
  cost: string;
  category: string;
  description: string;
  detailsText: string;
  variants: NewProductVariant[];
  saleMode: Product["saleMode"];
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
        curve_price: Number(curvePrice || price),
        retail_price: Number(retailPrice || price),
        cost: Number(cost),
        sale_mode: saleMode,
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
      curve_price: Number(product.curvePrice || product.price),
      retail_price: Number(product.retailPrice || product.price),
      sale_active: product.saleActive,
      sale_price: Number(product.salePrice || 0),
      sale_curve_price: Number(product.saleCurvePrice || 0),
      sale_starts_at: product.saleStartsAt || null,
      sale_ends_at: product.saleEndsAt || null,
      cost: Number(product.cost),
      sale_mode: product.saleMode,
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
