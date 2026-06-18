import type { CartItem } from "@/context/CartContext";

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
  total: number | string;
  whatsapp_message: string;
  created_at: string;
  updated_at: string;
  order_items?: SupabaseOrderItemRow[];
};
