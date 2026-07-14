import type { CartItem } from "@/context/CartContext";
import { storeConfig } from "@/config/store";
import { getCartItemUnits, isCurveProduct } from "@/lib/curve";
import { formatOrderNumber } from "@/lib/orderNumber";
import {
  getCartItemSubtotal,
  getCartItemUnitPrice,
  getCartPricing,
  formatPrice,
} from "@/lib/pricing";
import { getVariantSizeStock } from "@/lib/stock";
import { buildDirectWhatsAppUrl } from "@/lib/whatsapp";
import type { CustomerInfo } from "@/types/order";
import type { Product } from "@/types/product";

export function getCartTotal(cart: CartItem[]) {
  return getCartPricing(cart).total;
}

export function getCartItemLabel(item: CartItem) {
  if (isCurveProduct(item)) {
    return item.name.startsWith("Curva - ")
      ? item.name
      : `Curva - ${item.name}`;
  }

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
      const units = getCartItemUnits(item);
      const curveVariant = isCurveProduct(item)
        ? item.variants?.find(
            (variant) => variant.color === item.selectedColor
          )
        : undefined;
      const curveSizesLabel = curveVariant?.sizes
        .map((size) => size.size)
        .join(" · ");
      const curveValue =
        unitPrice * (curveVariant?.sizes.length ?? 0);

      if (isCurveProduct(item)) {
        return [
          getCartItemLabel(item),
          item.sku ? `SKU ${getShortSku(item.sku)}` : null,
          `${item.quantity} ${
            item.quantity === 1 ? "curva" : "curvas"
          } · ${units} prendas`,
          item.selectedColor ? `Color: ${item.selectedColor}` : null,
          curveSizesLabel ? `Talles: ${curveSizesLabel}` : null,
          `Cantidad: ${item.quantity} de cada talle`,
          `${item.quantity} x ${formatPrice(curveValue)} = ${formatPrice(subtotal)}`,
        ]
          .filter(Boolean)
          .join("\n");
      }

      return [
        item.name,
        item.sku ? `SKU ${getShortSku(item.sku)}` : null,
        [item.selectedColor, item.size ? `Talle ${item.size}` : null]
          .filter(Boolean)
          .join(" · "),
        `${item.quantity} x ${formatPrice(unitPrice)} = ${formatPrice(subtotal)}`,
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

  const whatsappUrl = buildDirectWhatsAppUrl({
    number: storeConfig.whatsappNumber,
    message,
  });

  if (whatsappUrl === "#") {
    throw new Error("El numero de WhatsApp configurado no es valido.");
  }

  return whatsappUrl;
}

export function buildOrderWhatsAppMessage({
  orderNumber,
  cart,
  customer,
  fulfillment,
  payment,
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
  payment?: {
    label: string;
    surcharge: number;
  };
  total: number;
}) {
  const fulfillmentBlock = fulfillment
    ? `ENTREGA: ${fulfillment.label}`
    : "";
  const paymentBlock = payment
    ? `PAGO: ${payment.label}`
    : "";
  const productsSubtotal = getCartTotal(cart);
  const summaryBlock = `RESUMEN
Subtotal productos: ${formatPrice(productsSubtotal)}${
    fulfillment?.fee
      ? `\nEmbalaje y cadeteria: ${formatPrice(fulfillment.fee)}`
      : ""
  }${
    payment?.surcharge
      ? `\nTransferencia 5%: ${formatPrice(payment.surcharge)}`
      : ""
  }
TOTAL: ${formatPrice(total)}`;

  return `Hola! Quiero realizar este pedido:

PEDIDO ${formatOrderNumber(orderNumber)}

PRODUCTOS

${formatCartItemsForWhatsApp(cart)}

${fulfillmentBlock}
${paymentBlock}

${summaryBlock}

DATOS DEL CLIENTE

Nombre: ${customer.name}
DNI/CUIT: ${customer.dni}
WhatsApp: ${customer.whatsapp}
Direccion: ${customer.address}
Localidad: ${customer.city}
Provincia: ${customer.province}
Codigo postal: ${customer.zip}
Correo: ${customer.email || "-"}
Notas: ${customer.notes || "-"}`;
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

    if (isCurveProduct(item)) {
      const variant = product.variants.find(
        (productVariant) => productVariant.color === item.selectedColor
      );

      for (const sizeItem of variant?.sizes ?? []) {
        const currentStock =
          sizeItem.stock ?? 0;
        const requestedStock = item.quantity;

        if (requestedStock > currentStock) {
          return `Stock insuficiente para ${item.name} (${item.selectedColor} / ${sizeItem.size}). Disponible: ${currentStock}.`;
        }
      }

      continue;
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
