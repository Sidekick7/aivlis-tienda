import type { CartItem } from "@/context/CartContext";
import { storeConfig } from "@/config/store";
import { getVariantSizeStock } from "@/lib/stock";
import type { CustomerInfo } from "@/types/order";
import type { Product } from "@/types/product";

export function getCartTotal(cart: CartItem[]) {
  return cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
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

export function formatCartItemsForWhatsApp(cart: CartItem[]) {
  return cart
    .map((item) => {
      const subtotal = item.price * item.quantity;

      return [
        `- ${getCartItemLabel(item)}`,
        `  Cantidad: ${item.quantity}`,
        `  Precio unitario: $${item.price}`,
        `  Subtotal: $${subtotal}`,
      ].join("\n");
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
  total,
}: {
  orderNumber: string;
  cart: CartItem[];
  customer: CustomerInfo;
  total: number;
}) {
  return `Hola! Quiero realizar este pedido:

Ticket: ${orderNumber}

${formatCartItemsForWhatsApp(cart)}

TOTAL: $${total}

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

Correo electronico:
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
