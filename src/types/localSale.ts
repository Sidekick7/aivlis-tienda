export type LocalSalePaymentMethod =
  | "cash"
  | "transfer"
  | "mixed";

export type LocalSaleItemInput = {
  productId: number;
  productSlug: string;
  productSku?: string;
  productName: string;
  variantColor: string;
  size: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
};

export type CreateLocalSaleInput = {
  saleNumber: string;
  paymentMethod: LocalSalePaymentMethod;
  total: number;
  internalNotes?: string;
  items: LocalSaleItemInput[];
};

export type LocalSaleStatus = "completed" | "cancelled";

export type LocalSaleItem = LocalSaleItemInput & {
  id: string;
};

export type LocalSale = {
  id: string;
  saleNumber: string;
  paymentMethod: LocalSalePaymentMethod;
  total: number;
  internalNotes?: string | null;
  status: LocalSaleStatus;
  createdAt: string;
  updatedAt: string;
  items: LocalSaleItem[];
};

export type SupabaseLocalSaleItemRow = {
  id: string;
  product_id: number | string;
  product_slug: string;
  product_sku?: string | null;
  product_name: string;
  variant_color: string;
  size: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  image_url?: string | null;
};

export type SupabaseLocalSaleRow = {
  id: string;
  sale_number: string;
  payment_method: LocalSalePaymentMethod;
  total: number | string;
  internal_notes?: string | null;
  status: LocalSaleStatus;
  created_at: string;
  updated_at: string;
  local_sale_items?: SupabaseLocalSaleItemRow[];
};
