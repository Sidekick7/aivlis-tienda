import type { CartItem } from "@/context/CartContext";
import { storeConfig } from "@/config/store";
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

Direccion:
${customer.address}

Localidad / Ciudad:
${customer.city}

Provincia:
${customer.province}

Codigo Postal:
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

    const selectedVariant =
      product.variants.find(
        (variant) => variant.color === item.selectedColor
      ) ?? product.variants[0];
    const selectedSize = selectedVariant?.sizes.find(
      (size) => size.size === item.size
    );
    const currentStock = selectedSize?.stock ?? 0;

    if (item.quantity > currentStock) {
      return `Stock insuficiente para ${getCartItemLabel(item)}. Disponible: ${currentStock}.`;
    }
  }

  return null;
}
