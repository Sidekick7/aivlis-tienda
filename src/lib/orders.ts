import { supabase } from "@/lib/supabase";
import type {
  CreatedOrderTicket,
  CreateOrderTicketInput,
} from "@/types/order";

export function createOrderNumber() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `AIV-${datePart}-${randomPart}`;
}

export async function createOrderTicket({
  orderNumber,
  cart,
  customer,
  total,
  whatsappMessage,
}: CreateOrderTicketInput): Promise<CreatedOrderTicket> {
  const orderId = crypto.randomUUID();

  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      order_number: orderNumber,
      status: "pending_payment",
      customer_name: customer.name,
      customer_dni: customer.dni,
      customer_whatsapp: customer.whatsapp,
      customer_address: customer.address,
      customer_city: customer.city,
      customer_province: customer.province,
      customer_zip: customer.zip,
      customer_email: customer.email || null,
      notes: customer.notes || null,
      total,
      whatsapp_message: whatsappMessage,
    });

  if (orderError) {
    throw orderError;
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      cart.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        product_slug: item.slug,
        product_name: item.name,
        variant_color: item.selectedColor || null,
        size: item.size || null,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        image_url: item.selectedImage || item.images?.[0] || null,
      }))
    );

  if (itemsError) {
    throw itemsError;
  }

  return {
    id: orderId,
    orderNumber,
  };
}
