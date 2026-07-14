import type { CartItem } from "@/context/CartContext";
import type { SaleItemMode } from "@/lib/saleItemGroups";

export type CustomerInfo = {
  name: string;
  dni: string;
  whatsapp: string;
  address: string;
  city: string;
  province: string;
  zip: string;
  email?: string;
  notes?: string;
};

export type CreateOrderTicketInput = {
  orderNumber: string;
  cart: CartItem[];
  customer: CustomerInfo;
  total: number;
  whatsappMessage: string;
};

export type CreatedOrderTicket = {
  id: string;
  orderNumber: string;
};

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled";

export type OrderFulfillmentStatus =
  | "to_prepare"
  | "prepared"
  | "shipped"
  | "delivered";

export type AdminOrderItem = {
  id: string;
  productId?: number | null;
  productSlug: string;
  productSku?: string | null;
  productName: string;
  variantColor?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  imageUrl?: string | null;
  lineGroupId?: string | null;
  saleMode: SaleItemMode;
  bundleQuantity: number;
  unitsPerBundle: number;
  bundlePrice: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerDni: string;
  customerWhatsapp: string;
  customerAddress: string;
  customerCity: string;
  customerProvince: string;
  customerZip: string;
  customerEmail?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  total: number;
  whatsappMessage: string;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
};

export type SupabaseOrderItemRow = {
  id: string;
  product_id?: number | null;
  product_slug: string;
  product_sku?: string | null;
  product_name: string;
  variant_color?: string | null;
  size?: string | null;
  quantity: number;
  unit_price: number | string;
  unit_cost?: number | string | null;
  subtotal: number | string;
  image_url?: string | null;
  line_group_id?: string | null;
  sale_mode?: SaleItemMode | null;
  bundle_quantity?: number | string | null;
  units_per_bundle?: number | string | null;
  bundle_price?: number | string | null;
};

export type SupabaseOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_dni: string;
  customer_whatsapp: string;
  customer_address: string;
  customer_city: string;
  customer_province: string;
  customer_zip: string;
  customer_email?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  fulfillment_status?: OrderFulfillmentStatus | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  total: number | string;
  whatsapp_message: string;
  created_at: string;
  updated_at: string;
  order_items?: SupabaseOrderItemRow[];
};
