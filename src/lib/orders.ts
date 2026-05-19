import { supabase } from "@/lib/supabase";
import { normalizeProduct } from "@/lib/products";
import type {
  AdminOrder,
  OrderStatus,
  CreatedOrderTicket,
  CreateOrderTicketInput,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
} from "@/types/order";
import type { Product, SupabaseProductRow } from "@/types/product";

function normalizeOrderItem(row: SupabaseOrderItemRow) {
  return {
    id: row.id,
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    variantColor: row.variant_color,
    size: row.size,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    subtotal: Number(row.subtotal),
    imageUrl: row.image_url,
  };
}

function normalizeOrder(row: SupabaseOrderRow): AdminOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerName: row.customer_name,
    customerDni: row.customer_dni,
    customerWhatsapp: row.customer_whatsapp,
    customerAddress: row.customer_address,
    customerCity: row.customer_city,
    customerProvince: row.customer_province,
    customerZip: row.customer_zip,
    customerEmail: row.customer_email,
    notes: row.notes,
    total: Number(row.total),
    whatsappMessage: row.whatsapp_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.order_items ?? []).map(normalizeOrderItem),
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

async function adjustStockForOrder(
  order: AdminOrder,
  direction: -1 | 1
) {
  const productIds = Array.from(
    new Set(
      order.items
        .map((item) => item.productId)
        .filter((id): id is number => typeof id === "number")
    )
  );

  if (productIds.length === 0) return;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);

  if (error) {
    throw error;
  }

  const products = new Map(
    (data ?? []).map((row) => {
      const product = normalizeProduct(row as SupabaseProductRow);

      return [product.id, product];
    })
  );

  for (const productId of productIds) {
    const product = products.get(productId);

    if (!product) {
      throw new Error("No se encontro un producto del pedido.");
    }

    const variants = cloneProductVariants(product);
    const orderItems = order.items.filter(
      (item) => item.productId === productId
    );

    for (const item of orderItems) {
      const variantIndex = Math.max(
        variants.findIndex(
          (variant) => variant.color === item.variantColor
        ),
        0
      );
      const selectedVariant = variants[variantIndex];
      const sizeIndex =
        selectedVariant?.sizes.findIndex(
          (size) => size.size === item.size
        ) ?? -1;

      if (!selectedVariant || sizeIndex < 0) {
        throw new Error(
          `No se encontro stock para ${item.productName}.`
        );
      }

      const currentStock = selectedVariant.sizes[sizeIndex].stock;
      const nextStock =
        currentStock + direction * item.quantity;

      if (nextStock < 0) {
        throw new Error(
          `Stock insuficiente para ${item.productName}.`
        );
      }

      selectedVariant.sizes[sizeIndex].stock = nextStock;
      selectedVariant.stock = selectedVariant.sizes.reduce(
        (total, size) => total + size.stock,
        0
      );
    }

    const totalStock = variants.reduce(
      (total, variant) => total + (variant.stock ?? 0),
      0
    );

    const { error: updateError } = await supabase
      .from("products")
      .update({
        variants,
        stock: totalStock,
      })
      .eq("id", product.id);

    if (updateError) {
      throw updateError;
    }
  }
}

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

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeOrder(row as SupabaseOrderRow)
  );
}

export async function updateOrderStatus(
  order: AdminOrder,
  status: OrderStatus
) {
  if (order.status === status) return;

  if (order.status !== "confirmed" && status === "confirmed") {
    await adjustStockForOrder(order, -1);
  }

  if (order.status === "confirmed" && status !== "confirmed") {
    await adjustStockForOrder(order, 1);
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    throw error;
  }
}
