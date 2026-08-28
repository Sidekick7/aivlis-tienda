import { supabase } from "@/lib/supabase";
import type {
  OrderFulfillmentStatus,
  OrderStatus,
} from "@/types/order";

export type CustomerOrderItem = {
  id: string;
  productSlug: string;
  productName: string;
  variantColor?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string | null;
  lineGroupId?: string | null;
  saleMode: "unit" | "curve";
  bundleQuantity: number;
  unitsPerBundle: number;
  bundlePrice: number;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveryMethod: string;
  paymentMethod: string;
  items: CustomerOrderItem[];
};

type CustomerOrderItemRow = {
  id: string;
  product_slug: string;
  product_name: string;
  variant_color?: string | null;
  size?: string | null;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  image_url?: string | null;
  line_group_id?: string | null;
  sale_mode?: "unit" | "curve" | null;
  bundle_quantity?: number | string | null;
  units_per_bundle?: number | string | null;
  bundle_price?: number | string | null;
};

type CustomerOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number | string;
  created_at: string;
  updated_at: string;
  fulfillment_status?: OrderFulfillmentStatus | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivery_method?: string | null;
  payment_method?: string | null;
  items?: CustomerOrderItemRow[] | null;
};

function normalizeItem(item: CustomerOrderItemRow): CustomerOrderItem {
  return {
    id: item.id,
    productSlug: item.product_slug,
    productName: item.product_name,
    variantColor: item.variant_color,
    size: item.size,
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unit_price) || 0,
    subtotal: Number(item.subtotal) || 0,
    imageUrl: item.image_url,
    lineGroupId: item.line_group_id,
    saleMode: item.sale_mode === "curve" ? "curve" : "unit",
    bundleQuantity: Number(item.bundle_quantity) || 1,
    unitsPerBundle: Number(item.units_per_bundle) || 1,
    bundlePrice: Number(item.bundle_price) || Number(item.unit_price) || 0,
  };
}

export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  const { data, error } = await supabase.rpc("get_my_orders");

  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as CustomerOrderRow[]) : [];

  return rows.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    total: Number(order.total) || 0,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    fulfillmentStatus: order.fulfillment_status ?? "to_prepare",
    shippingCarrier: order.shipping_carrier,
    trackingNumber: order.tracking_number,
    shippedAt: order.shipped_at,
    deliveryMethod: order.delivery_method || "A coordinar",
    paymentMethod: order.payment_method || "A coordinar",
    items: (order.items ?? []).map(normalizeItem),
  }));
}
