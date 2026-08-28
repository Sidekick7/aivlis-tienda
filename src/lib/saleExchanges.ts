import { supabase } from "@/lib/supabase";
import type {
  CreateSaleExchangeInput,
  SaleExchange,
  SaleExchangeSource,
  SupabaseSaleExchangeRow,
} from "@/types/saleExchange";

function normalizeSaleExchange(row: SupabaseSaleExchangeRow): SaleExchange {
  return {
    id: row.id,
    sourceType: row.source_type,
    saleId: row.sale_id,
    sourceItemId: row.source_item_id,
    returnedProductId: Number(row.returned_product_id),
    returnedProductSku: row.returned_product_sku,
    returnedProductName: row.returned_product_name,
    returnedVariantColor: row.returned_variant_color,
    returnedSize: row.returned_size,
    replacementProductId: Number(row.replacement_product_id),
    replacementProductSku: row.replacement_product_sku,
    replacementProductName: row.replacement_product_name,
    replacementVariantColor: row.replacement_variant_color,
    replacementSize: row.replacement_size,
    quantity: Number(row.quantity),
    originalUnitPrice: Number(row.original_unit_price),
    replacementUnitPrice: Number(row.replacement_unit_price),
    replacementUnitCost: Number(row.replacement_unit_cost),
    differenceTotal: Number(row.difference_total),
    paymentMethod: row.payment_method,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function getSaleExchanges(
  sourceType: SaleExchangeSource,
  saleId: string
): Promise<SaleExchange[]> {
  const { data, error } = await supabase
    .from("sale_exchanges")
    .select("*")
    .eq("source_type", sourceType)
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeSaleExchange(row as SupabaseSaleExchangeRow)
  );
}

export async function createSaleExchange(input: CreateSaleExchangeInput) {
  const { data, error } = await supabase.rpc("create_sale_exchange", {
    p_source_type: input.sourceType,
    p_sale_id: input.saleId,
    p_source_item_id: input.sourceItemId,
    p_replacement_product_id: input.replacementProductId,
    p_replacement_variant_color: input.replacementVariantColor,
    p_replacement_size: input.replacementSize,
    p_quantity: input.quantity,
    p_replacement_unit_price: input.replacementUnitPrice,
    p_payment_method: input.paymentMethod ?? null,
    p_note: input.note?.trim() || null,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function assertSaleHasNoExchanges(
  sourceType: SaleExchangeSource,
  saleId: string
) {
  const { count, error } = await supabase
    .from("sale_exchanges")
    .select("id", { count: "exact", head: true })
    .eq("source_type", sourceType)
    .eq("sale_id", saleId);

  if (error) {
    // Keeps existing sale actions usable until the new migration is installed.
    if (error.code === "42P01") return;
    throw error;
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      "Esta venta tiene cambios registrados y debe conservarse en el historial."
    );
  }
}
