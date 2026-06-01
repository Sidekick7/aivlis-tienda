import type { CartItem } from "@/context/CartContext";
import { storeConfig } from "@/config/store";
import { formatOrderNumber } from "@/lib/orderNumber";
import {
  getCartItemSubtotal,
  getCartItemUnitPrice,
  getCartPricing,
  formatPrice,
} from "@/lib/pricing";
import { getVariantSizeStock } from "@/lib/stock";
import type { CustomerInfo } from "@/types/order";
import type { Product } from "@/types/product";

export function getCartTotal(cart: CartItem[]) {
  return getCartPricing(cart).total;
}

export function getCartItemLabel(item: CartItem) {
  const details = [
    item.selectedColor,
    item.size ? `Talle ${item.size}` : null,
  ].filter(Boolean);

  return details.length > 0
    ? `${item.name} (${details.join(" / ")})`
    : item.name;
}

function getShortSku(sku?: string) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku;
}

export function formatCartItemsForWhatsApp(cart: CartItem[]) {
  const cartPricing = getCartPricing(cart);

  return cart
    .map((item) => {
      const unitPrice = getCartItemUnitPrice(
        item,
        cartPricing.isWholesale
      );
      const subtotal = getCartItemSubtotal(
        item,
        cartPricing.isWholesale
      );

      return [
        `- ${getCartItemLabel(item)}`,
        item.sku ? `  SKU: ${getShortSku(item.sku)}` : null,
        `  Cantidad: ${item.quantity}`,
        `  Precio unitario: ${formatPrice(unitPrice)}`,
        `  Subtotal: ${formatPrice(subtotal)}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function buildWhatsAppUrl(message: string) {
  if (!storeConfig.whatsappNumber) {
    throw new Error("Falta configurar NEXT_PUBLIC_WHATSAPP_NUMBER.");
  }

  return `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

export function buildOrderWhatsAppMessage({
  orderNumber,
  cart,
  customer,
  fulfillment,
  total,
}: {
  orderNumber: string;
  cart: CartItem[];
  customer: CustomerInfo;
  fulfillment?: {
    label: string;
    description: string;
    fee: number;
  };
  total: number;
}) {
  const fulfillmentBlock = fulfillment
    ? fulfillment.fee > 0
      ? `ENTREGA
${fulfillment.label}: ${formatPrice(fulfillment.fee)}
Envio a cargo del cliente segun peso y distancia.

`
      : `ENTREGA
${fulfillment.label}: sin costo.

`
    : "";

  return `Hola! Quiero realizar este pedido:

Pedido ${formatOrderNumber(orderNumber)}

${formatCartItemsForWhatsApp(cart)}

${fulfillmentBlock}
TOTAL: ${formatPrice(total)}

DATOS DEL CLIENTE

Nombre y apellido:
${customer.name}

DNI o CUIT:
${customer.dni}

WhatsApp:
${customer.whatsapp}

Dirección:
${customer.address}

Localidad / Ciudad:
${customer.city}

Provincia:
${customer.province}

Código Postal:
${customer.zip}

Correo electrónico:
${customer.email || "-"}

Notas adicionales:
${customer.notes || "-"}`;
}

export function validateCartStock(
  cart: CartItem[],
  products: Product[]
) {
  const productsById = new Map(
    products.map((product) => [product.id, product])
  );

  for (const item of cart) {
    const product = productsById.get(item.id);

    if (!product) {
      return `${item.name} ya no esta disponible.`;
    }

    const currentStock = getVariantSizeStock({
      variants: product.variants,
      color: item.selectedColor,
      size: item.size,
    });

    if (item.quantity > currentStock) {
      return `Stock insuficiente para ${getCartItemLabel(item)}. Disponible: ${currentStock}.`;
    }
  }

  return null;
}
