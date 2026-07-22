import { supabase } from "@/lib/supabase";
import {
  getCartItemSubtotal,
  getCartItemUnitPrice,
  getCartPricing,
} from "@/lib/pricing";
import { isCurveProduct } from "@/lib/curve";
import { normalizeProduct } from "@/lib/products";
import { findVariantSize } from "@/lib/stock";
import type {
  AdminOrder,
  AdminOrderItem,
  OrderFulfillmentStatus,
  OrderStatus,
  CreatedOrderTicket,
  CreateOrderTicketInput,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
} from "@/types/order";
import type { Product, SupabaseProductRow } from "@/types/product";

function getCurveOrderProductName(item: {
  name: string;
  size?: string;
}) {
  const sizeLabel = item.size || "";
  const nameWithoutCurveLabel = sizeLabel
    ? item.name.replace(` (${sizeLabel})`, "")
    : item.name;

  return nameWithoutCurveLabel.startsWith("Curva - ")
    ? nameWithoutCurveLabel
    : `Curva - ${nameWithoutCurveLabel}`;
}

function getOrderItemImageUrl(
  row: SupabaseOrderItemRow,
  productsById?: Map<number, Product>
) {
  const product =
    typeof row.product_id === "number"
      ? productsById?.get(row.product_id)
      : undefined;
  const variantImage = product?.variants.find(
    (variant) => variant.color === row.variant_color
  )?.images[0];

  return variantImage || row.image_url || "";
}

function getCartItemVariantImage(item: {
  selectedColor?: string;
  selectedImage?: string;
  images?: string[];
  variants?: Product["variants"];
}) {
  const variantImage = item.variants?.find(
    (variant) => variant.color === item.selectedColor
  )?.images[0];

  return variantImage || item.selectedImage || item.images?.[0] || "";
}

function normalizeOrderItem(
  row: SupabaseOrderItemRow,
  productsById?: Map<number, Product>
): AdminOrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    productSlug: row.product_slug,
    productSku: row.product_sku,
    productName: row.product_name,
    variantColor: row.variant_color,
    size: row.size,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    unitCost: Number(row.unit_cost ?? 0),
    subtotal: Number(row.subtotal),
    imageUrl: getOrderItemImageUrl(row, productsById),
    lineGroupId: row.line_group_id,
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

function normalizeOrder(
  row: SupabaseOrderRow,
  productsById?: Map<number, Product>
): AdminOrder {
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
    internalNotes: row.internal_notes,
    fulfillmentStatus: row.fulfillment_status ?? "to_prepare",
    shippingCarrier: row.shipping_carrier,
    trackingNumber: row.tracking_number,
    shippedAt: row.shipped_at,
    total: Number(row.total),
    whatsappMessage: row.whatsapp_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.order_items ?? []).map((item) =>
      normalizeOrderItem(item, productsById)
    ),
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

function normalizeInventoryLabel(value?: string | null) {
  return (value || "").trim().toLocaleLowerCase("es-AR");
}

function getComparableImageUrl(value?: string | null) {
  return (value || "").trim().split("?")[0];
}

function findOrderItemVariantSize({
  variants,
  item,
}: {
  variants: Product["variants"];
  item: AdminOrderItem;
}) {
  const directMatch = findVariantSize({
    variants,
    color: item.variantColor,
    size: item.size,
  });

  if (directMatch) return directMatch;

  const normalizedColor = normalizeInventoryLabel(item.variantColor);
  const normalizedSize = normalizeInventoryLabel(item.size);
  const matchingSizeForVariant = (variantIndex: number) =>
    variants[variantIndex]?.sizes.find(
      (sizeItem) => normalizeInventoryLabel(sizeItem.size) === normalizedSize
    );
  const buildMatch = (variantIndex: number) => {
    const matchingSize = matchingSizeForVariant(variantIndex);

    if (!matchingSize) return null;

    return findVariantSize({
      variants,
      color: variants[variantIndex].color,
      size: matchingSize.size,
    });
  };

  const normalizedColorIndex = variants.findIndex(
    (variant) => normalizeInventoryLabel(variant.color) === normalizedColor
  );
  const normalizedMatch =
    normalizedColorIndex >= 0 ? buildMatch(normalizedColorIndex) : null;

  if (normalizedMatch) return normalizedMatch;

  const orderImage = getComparableImageUrl(item.imageUrl);
  const imageCandidateIndexes = orderImage
    ? variants.flatMap((variant, variantIndex) => {
        const hasSameImage = variant.images.some(
          (image) => getComparableImageUrl(image) === orderImage
        );

        return hasSameImage && matchingSizeForVariant(variantIndex)
          ? [variantIndex]
          : [];
      })
    : [];

  if (imageCandidateIndexes.length === 1) {
    return buildMatch(imageCandidateIndexes[0]);
  }

  if (variants.length === 1) {
    return buildMatch(0);
  }

  return null;
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
      const selectedStock = findOrderItemVariantSize({
        variants,
        item,
      });

      if (!selectedStock) {
        throw new Error(
          `No se pudo identificar el stock de ${item.productName} (${item.variantColor || "sin color"} / ${item.size || "sin talle"}).`
        );
      }

      const { variant: selectedVariant, sizeIndex } =
        selectedStock;
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
  const randomPart = Math.floor(
    Math.random() * 1_000_000
  )
    .toString()
    .padStart(6, "0");

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
  const cartPricing = getCartPricing(cart);
  const orderItems = cart.flatMap((item) => {
    const lineGroupId = crypto.randomUUID();
    const unitPrice = getCartItemUnitPrice(
      item,
      cartPricing.isWholesale
    );

    if (!isCurveProduct(item)) {
      return [
        {
          product_id: item.id,
          product_slug: item.slug,
          product_sku: item.sku || "",
          product_name: item.name,
          variant_color: item.selectedColor || "",
          size: item.size || "",
          quantity: item.quantity,
          unit_price: unitPrice,
          unit_cost: Number(item.cost ?? 0),
          subtotal: getCartItemSubtotal(item, cartPricing.isWholesale),
          image_url: getCartItemVariantImage(item),
          line_group_id: lineGroupId,
          sale_mode: "unit",
          bundle_quantity: item.quantity,
          units_per_bundle: 1,
          bundle_price: unitPrice,
        },
      ];
    }

    const curveVariant = item.variants?.find(
      (variant) => variant.color === item.selectedColor
    );
    const quantityBySize = item.quantity;
    const unitsPerBundle = curveVariant?.sizes.length ?? 0;
    const bundlePrice = unitPrice * unitsPerBundle;

    return (curveVariant?.sizes ?? []).map((sizeItem) => ({
      product_id: item.id,
      product_slug: item.slug,
      product_sku: item.sku || "",
      product_name: getCurveOrderProductName(item),
      variant_color: item.selectedColor || "",
      size: sizeItem.size,
      quantity: quantityBySize,
      unit_price: unitPrice,
      unit_cost: Number(item.cost ?? 0),
      subtotal: unitPrice * quantityBySize,
      image_url: getCartItemVariantImage(item),
      line_group_id: lineGroupId,
      sale_mode: "curve",
      bundle_quantity: item.quantity,
      units_per_bundle: unitsPerBundle,
      bundle_price: bundlePrice,
    }));
  });
  const { error } = await supabase.rpc("create_order_ticket", {
    order_id: orderId,
    order_number: orderNumber,
    customer_name: customer.name,
    customer_dni: customer.dni,
    customer_whatsapp: customer.whatsapp,
    customer_address: customer.address,
    customer_city: customer.city,
    customer_province: customer.province,
    customer_zip: customer.zip,
    customer_email: customer.email || "",
    notes: customer.notes || "",
    total,
    whatsapp_message: whatsappMessage,
    items: orderItems,
  });

  if (error) {
    throw error;
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

  const productIds = Array.from(
    new Set(
      (data ?? []).flatMap((row) =>
        ((row as SupabaseOrderRow).order_items ?? [])
          .map((item) => item.product_id)
          .filter((id): id is number => typeof id === "number")
      )
    )
  );

  if (productIds.length === 0) {
    return (data ?? []).map((row) =>
      normalizeOrder(row as SupabaseOrderRow)
    );
  }

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);

  if (productsError) {
    throw productsError;
  }

  const productsById = new Map(
    (productsData ?? []).map((row) => {
      const product = normalizeProduct(row as SupabaseProductRow);

      return [product.id, product];
    })
  );

  const orders = (data ?? []).map((row) =>
    normalizeOrder(row as SupabaseOrderRow, productsById)
  );

  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      productSku:
        item.productSku ||
        (item.productId
          ? productsById.get(item.productId)?.sku
          : "") ||
        null,
    })),
  }));
}

export async function updateOrderStatus(
  order: AdminOrder,
  status: OrderStatus
) {
  if (order.status === status) return;

  const wasReserved = order.status !== "cancelled";
  const shouldBeReserved = status !== "cancelled";

  if (!wasReserved && shouldBeReserved) {
    await adjustStockForOrder(order, -1);
  }

  if (wasReserved && !shouldBeReserved) {
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

export async function updateOrderInternalNotes(
  orderId: string,
  internalNotes: string
) {
  const { error } = await supabase
    .from("orders")
    .update({
      internal_notes: internalNotes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

export async function updateOrderFulfillment(
  orderId: string,
  {
    fulfillmentStatus,
    shippingCarrier,
    trackingNumber,
    shippedAt,
  }: {
    fulfillmentStatus: OrderFulfillmentStatus;
    shippingCarrier: string;
    trackingNumber: string;
    shippedAt: string;
  }
) {
  const { error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: fulfillmentStatus,
      shipping_carrier: shippingCarrier.trim() || null,
      tracking_number: trackingNumber.trim() || null,
      shipped_at: shippedAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

export async function deleteOrder(order: AdminOrder) {
  if (order.status !== "cancelled") {
    await adjustStockForOrder(order, 1);
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", order.id);

  if (error) {
    throw error;
  }
}
