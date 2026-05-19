import type { CartItem } from "@/context/CartContext";
import { storeConfig } from "@/config/store";

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
