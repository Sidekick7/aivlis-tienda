export type SaleExchangeSource = "web" | "local";

export type SaleExchangePaymentMethod = "cash" | "transfer";

export type SaleExchange = {
  id: string;
  sourceType: SaleExchangeSource;
  saleId: string;
  sourceItemId: string;
  returnedProductId: number;
  returnedProductSku?: string | null;
  returnedProductName: string;
  returnedVariantColor: string;
  returnedSize: string;
  replacementProductId: number;
  replacementProductSku?: string | null;
  replacementProductName: string;
  replacementVariantColor: string;
  replacementSize: string;
  quantity: number;
  originalUnitPrice: number;
  replacementUnitPrice: number;
  replacementUnitCost: number;
  differenceTotal: number;
  paymentMethod?: SaleExchangePaymentMethod | null;
  note?: string | null;
  createdAt: string;
};

export type CreateSaleExchangeInput = {
  sourceType: SaleExchangeSource;
  saleId: string;
  sourceItemId: string;
  replacementProductId: number;
  replacementVariantColor: string;
  replacementSize: string;
  quantity: number;
  replacementUnitPrice: number;
  paymentMethod?: SaleExchangePaymentMethod | null;
  note?: string;
};

export type SupabaseSaleExchangeRow = {
  id: string;
  source_type: SaleExchangeSource;
  sale_id: string;
  source_item_id: string;
  returned_product_id: number | string;
  returned_product_sku?: string | null;
  returned_product_name: string;
  returned_variant_color: string;
  returned_size: string;
  replacement_product_id: number | string;
  replacement_product_sku?: string | null;
  replacement_product_name: string;
  replacement_variant_color: string;
  replacement_size: string;
  quantity: number;
  original_unit_price: number | string;
  replacement_unit_price: number | string;
  replacement_unit_cost: number | string;
  difference_total: number | string;
  payment_method?: SaleExchangePaymentMethod | null;
  note?: string | null;
  created_at: string;
};
