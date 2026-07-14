import { supabase } from "@/lib/supabase";
import { getProductsByIds } from "@/lib/products";
import { findVariantSize } from "@/lib/stock";
import type { Product } from "@/types/product";
import type {
  CreateLocalSaleInput,
  LocalSale,
  LocalSaleItemInput,
  LocalSaleStatus,
  SupabaseLocalSaleItemRow,
  SupabaseLocalSaleRow,
} from "@/types/localSale";

function normalizeLocalSaleItem(
  row: SupabaseLocalSaleItemRow
): LocalSale["items"][number] {
  return {
    id: row.id,
    productId: Number(row.product_id),
    productSlug: row.product_slug,
    productSku: row.product_sku ?? "",
    productName: row.product_name,
    variantColor: row.variant_color,
    size: row.size,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    unitCost: Number(row.unit_cost ?? 0),
    subtotal: Number(row.subtotal),
    imageUrl: row.image_url ?? "",
    lineGroupId: row.line_group_id ?? undefined,
    saleMode:
      row.sale_mode === "curve" ||
      row.product_name.startsWith("Curva - ") ||
      /\(Curva\s+/i.test(row.product_name)
        ? "curve"
        : "unit",
    bundleQuantity: Number(row.bundle_quantity ?? row.quantity),
    unitsPerBundle: Number(row.units_per_bundle ?? 0),
    bundlePrice: Number(row.bundle_price ?? 0),
  };
}

function normalizeLocalSale(row: SupabaseLocalSaleRow): LocalSale {
  return {
    id: row.id,
    saleNumber: row.sale_number,
    paymentMethod: row.payment_method,
    total: Number(row.total),
    internalNotes: row.internal_notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.local_sale_items ?? []).map(normalizeLocalSaleItem),
  };
}

function cloneProductVariants(product: Product) {
  return product.variants.map((variant) => ({
    ...variant,
    sizes: variant.sizes.map((size) => ({
      ...size,
    })),
    images: [...variant.images],
  }));
}

export function createLocalSaleNumber() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const randomPart = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");

  return `LOCAL-${datePart}-${randomPart}`;
}

async function adjustStockForLocalSale(
  items: LocalSaleItemInput[],
  direction: -1 | 1
) {
  const productIds = Array.from(
    new Set(items.map((item) => item.productId))
  );
  const products = await getProductsByIds(productIds, {
    includeInactive: true,
  });
  const productsById = new Map(
    products.map((product) => [product.id, product])
  );

  for (const productId of productIds) {
    const product = productsById.get(productId);

    if (!product) {
      throw new Error("No se encontro un producto de la venta.");
    }

    const variants = cloneProductVariants(product);
    const productItems = items.filter(
      (item) => item.productId === productId
    );

    for (const item of productItems) {
      const selectedStock = findVariantSize({
        variants,
        color: item.variantColor,
        size: item.size,
      });

      if (!selectedStock) {
        throw new Error(
          `No se encontro stock para ${item.productName}.`
        );
      }

      const { variant, sizeIndex } = selectedStock;
      const currentStock = variant.sizes[sizeIndex].stock;
      const nextStock = currentStock + direction * item.quantity;

      if (nextStock < 0) {
        throw new Error(
          `Stock insuficiente para ${item.productName}. Disponible: ${currentStock}.`
        );
      }

      variant.sizes[sizeIndex].stock = nextStock;
      variant.stock = variant.sizes.reduce(
        (total, size) => total + size.stock,
        0
      );
    }

    const totalStock = variants.reduce(
      (total, variant) => total + (variant.stock ?? 0),
      0
    );

    const { error } = await supabase
      .from("products")
      .update({
        variants,
        stock: totalStock,
      })
      .eq("id", product.id);

    if (error) {
      throw error;
    }
  }
}

async function attachUnitCostsToLocalSaleItems(
  items: LocalSaleItemInput[]
) {
  const productIds = Array.from(
    new Set(items.map((item) => item.productId))
  );
  const products = await getProductsByIds(productIds, {
    includeInactive: true,
  });
  const productsById = new Map(
    products.map((product) => [product.id, product])
  );

  return items.map((item) => ({
    ...item,
    unitCost:
      item.unitCost ??
      productsById.get(item.productId)?.cost ??
      0,
  }));
}

export async function createLocalSale({
  saleNumber,
  paymentMethod,
  status = "completed",
  total,
  internalNotes,
  items,
}: CreateLocalSaleInput) {
  if (items.length === 0) {
    throw new Error("Agrega al menos un producto.");
  }

  const itemsWithCosts = await attachUnitCostsToLocalSaleItems(items);

  await adjustStockForLocalSale(itemsWithCosts, -1);

  const { data: sale, error: saleError } = await supabase
    .from("local_sales")
    .insert({
      sale_number: saleNumber,
      payment_method: paymentMethod,
      status,
      total,
      internal_notes: internalNotes?.trim() || null,
    })
    .select("id")
    .single();

  if (saleError) {
    throw saleError;
  }

  const saleId = sale?.id as string | undefined;

  if (!saleId) {
    throw new Error("No se pudo crear la venta local.");
  }

  const { error: itemsError } = await supabase
    .from("local_sale_items")
    .insert(
      itemsWithCosts.map((item) => ({
        sale_id: saleId,
        product_id: item.productId,
        product_slug: item.productSlug,
        product_sku: item.productSku || "",
        product_name: item.productName,
        variant_color: item.variantColor,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        subtotal: item.subtotal,
        image_url: item.imageUrl || "",
        line_group_id: item.lineGroupId || crypto.randomUUID(),
        sale_mode: item.saleMode || "unit",
        bundle_quantity: item.bundleQuantity || item.quantity,
        units_per_bundle: item.unitsPerBundle || 1,
        bundle_price: item.bundlePrice || item.unitPrice,
      }))
    );

  if (itemsError) {
    throw itemsError;
  }

  return {
    id: saleId,
    saleNumber,
  };
}

export async function getLocalSales(): Promise<LocalSale[]> {
  const { data, error } = await supabase
    .from("local_sales")
    .select("*, local_sale_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeLocalSale(row as SupabaseLocalSaleRow)
  );
}

export async function cancelLocalSale(sale: LocalSale) {
  await updateLocalSaleStatus(sale, "cancelled");
}

function isReservedLocalSaleStatus(status: LocalSaleStatus) {
  return status !== "cancelled";
}

export async function updateLocalSaleStatus(
  sale: LocalSale,
  nextStatus: LocalSaleStatus
) {
  if (sale.status === nextStatus) return;

  const wasReserved = isReservedLocalSaleStatus(sale.status);
  const shouldBeReserved = isReservedLocalSaleStatus(nextStatus);

  if (wasReserved !== shouldBeReserved) {
    await adjustStockForLocalSale(sale.items, shouldBeReserved ? -1 : 1);
  }

  const { error } = await supabase
    .from("local_sales")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sale.id);

  if (error) {
    throw error;
  }
}

export async function deleteLocalSale(sale: LocalSale | string) {
  const saleId = typeof sale === "string" ? sale : sale.id;

  const { error } = await supabase
    .from("local_sales")
    .delete()
    .eq("id", saleId);

  if (error) {
    throw error;
  }
}
