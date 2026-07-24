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

export type WebPriceMode = "unit" | "curve";

type SalePricedProduct = Pick<
  Product,
  | "price"
  | "curvePrice"
  | "saleActive"
  | "salePrice"
  | "saleCurvePrice"
  | "saleStartsAt"
  | "saleEndsAt"
>;

export function getRegularWebUnitPrice(
  product: Pick<Product, "price" | "curvePrice">,
  mode: WebPriceMode
) {
  if (mode === "curve" && Number(product.curvePrice || 0) > 0) {
    return Number(product.curvePrice);
  }

  return Number(product.price || 0);
}

export function isProductSaleActive(
  product: SalePricedProduct,
  mode: WebPriceMode,
  now = new Date()
) {
  if (!product.saleActive) return false;

  const startsAt = product.saleStartsAt
    ? new Date(product.saleStartsAt)
    : null;
  const endsAt = product.saleEndsAt
    ? new Date(product.saleEndsAt)
    : null;

  if (startsAt && Number.isFinite(startsAt.getTime()) && now < startsAt) {
    return false;
  }

  if (endsAt && Number.isFinite(endsAt.getTime()) && now >= endsAt) {
    return false;
  }

  const regularPrice = getRegularWebUnitPrice(product, mode);
  const salePrice =
    mode === "curve"
      ? Number(product.saleCurvePrice || 0)
      : Number(product.salePrice || 0);

  return salePrice > 0 && salePrice < regularPrice;
}

export function getEffectiveWebUnitPrice(
  product: SalePricedProduct,
  mode: WebPriceMode
) {
  if (!isProductSaleActive(product, mode)) {
    return getRegularWebUnitPrice(product, mode);
  }

  return mode === "curve"
    ? Number(product.saleCurvePrice)
    : Number(product.salePrice);
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
  const meetsWholesaleMinimum = wholesaleSubtotal >= wholesaleMinimum;
  const isWholesale = true;
  const total = wholesaleSubtotal;
  const hasCurveWholesale = curveWholesaleSubtotal > 0;

  return {
    total,
    wholesaleSubtotal,
    retailSubtotal,
    curveWholesaleSubtotal,
    unitRetailSubtotal,
    isWholesale,
    meetsWholesaleMinimum,
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
