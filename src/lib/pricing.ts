import type { CartItem } from "@/context/CartContext";
import { storeConfig } from "@/config/store";
import { getCartItemUnits, isCurveProduct } from "@/lib/curve";
import type { Product } from "@/types/product";

export const wholesaleMinimum = storeConfig.wholesaleMinimum;
const priceFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatPrice(value: number) {
  return `$${priceFormatter.format(value)}`;
}

export function getWholesalePrice(
  item: Pick<Product, "price">
) {
  return Number(item.price || 0);
}

export function getRetailPrice(
  item: Pick<Product, "price" | "retailPrice">
) {
  const retailPrice = Number(item.retailPrice || 0);

  return retailPrice > 0 ? retailPrice : getWholesalePrice(item);
}

export function hasDifferentRetailPrice(
  item: Pick<Product, "price" | "retailPrice">
) {
  return getRetailPrice(item) !== getWholesalePrice(item);
}

export function getCartWholesaleSubtotal(cart: CartItem[]) {
  return cart.reduce(
    (total, item) =>
      total + getWholesalePrice(item) * getCartItemUnits(item),
    0
  );
}

export function getCartRetailSubtotal(cart: CartItem[]) {
  return cart.reduce(
    (total, item) =>
      total + getRetailPrice(item) * getCartItemUnits(item),
    0
  );
}

export function getCartPricing(cart: CartItem[]) {
  const wholesaleSubtotal = getCartWholesaleSubtotal(cart);
  const retailSubtotal = getCartRetailSubtotal(cart);
  const curveWholesaleSubtotal = cart.reduce(
    (total, item) =>
      isCurveProduct(item)
        ? total + getWholesalePrice(item) * getCartItemUnits(item)
        : total,
    0
  );
  const unitRetailSubtotal = cart.reduce(
    (total, item) =>
      isCurveProduct(item)
        ? total
        : total + getRetailPrice(item) * getCartItemUnits(item),
    0
  );
  const isWholesale = wholesaleSubtotal >= wholesaleMinimum;
  const total = isWholesale
    ? wholesaleSubtotal
    : curveWholesaleSubtotal + unitRetailSubtotal;
  const hasCurveWholesale = curveWholesaleSubtotal > 0;

  return {
    total,
    wholesaleSubtotal,
    retailSubtotal,
    curveWholesaleSubtotal,
    unitRetailSubtotal,
    isWholesale,
    hasCurveWholesale,
    remainingForWholesale: Math.max(
      wholesaleMinimum - wholesaleSubtotal,
      0
    ),
    savings: Math.max(retailSubtotal - total, 0),
  };
}

export function getCartItemUnitPrice(
  item: CartItem,
  isWholesale: boolean
) {
  return isWholesale || isCurveProduct(item)
    ? getWholesalePrice(item)
    : getRetailPrice(item);
}

export function getCartItemSubtotal(
  item: CartItem,
  isWholesale: boolean
) {
  return getCartItemUnitPrice(item, isWholesale) * getCartItemUnits(item);
}
