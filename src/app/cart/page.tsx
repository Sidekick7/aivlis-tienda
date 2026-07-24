"use client";

import { useCart } from "@/context/CartContext";
import { fallbackProductImage } from "@/config/store";
import {
  getCartTotal,
  validateCartStock,
} from "@/lib/order";
import {
  getCartItemUnits,
  getCurveSizesFromVariant,
  getCurveStockLimit,
  isCurveProduct,
} from "@/lib/curve";
import {
  formatPrice,
  getCartItemSubtotal,
  getCartItemUnitPrice,
  getCartPricing,
  wholesaleMinimum,
} from "@/lib/pricing";
import { getProductsByIds } from "@/lib/products";
import { getVariantSizeStock } from "@/lib/stock";
import { useEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";

export default function CartPage() {

const {
  cart,
  removeFromCart,
  increaseQuantity,
  deleteItem,
  isCartReady,
} = useCart();

  const total = getCartTotal(cart);
  const transferSurcharge = Math.round(total * 0.05);
  const finalTotal = total + transferSurcharge;
  const cartPricing = getCartPricing(cart);
  const wholesaleProgress = Math.min(
    (cartPricing.wholesaleSubtotal / wholesaleMinimum) * 100,
    100
  );
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [stockError, setStockError] = useState("");
  const currentProductsById = useMemo(
    () =>
      new Map(
        currentProducts.map((product) => [
          product.id,
          product,
        ])
      ),
    [currentProducts]
  );
  const isCheckoutBlocked =
    isCheckingStock ||
    Boolean(stockError) ||
    !cartPricing.meetsWholesaleMinimum;

  useEffect(() => {
    let isCurrent = true;

    if (!isCartReady || cart.length === 0) {
      queueMicrotask(() => {
        if (!isCurrent) return;

        setCurrentProducts([]);
        setStockError("");
        setIsCheckingStock(false);
      });

      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (!isCurrent) return;

      setIsCheckingStock(true);
      setStockError("");
    });

    getProductsByIds(cart.map((item) => item.id))
      .then((products) => {
        if (!isCurrent) return;

        setCurrentProducts(products);
        setStockError(validateCartStock(cart, products) ?? "");
      })
      .catch((error) => {
        if (!isCurrent) return;

        setStockError(
          error instanceof Error
            ? `No se pudo validar el stock: ${error.message}`
            : "No se pudo validar el stock."
        );
      })
      .finally(() => {
        if (isCurrent) {
          setIsCheckingStock(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [cart, isCartReady]);

  return (

    <main className="home-main-offset min-h-screen bg-zinc-100 px-6 pb-20 text-black">

      <div className="mx-auto mt-6 max-w-7xl md:mt-8">

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">
      <div className="flex flex-col">

        {!isCartReady && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 py-24 text-center">
            <p className="text-zinc-500">
              Cargando carrito...
            </p>
          </div>
        )}

        {isCartReady && cart.length === 0 && (

          <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 py-24 text-center">

            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100">

                <ShoppingBag
                size={30}
                className="text-zinc-500"
                />

            </div>

            <h2 className="font-brand mb-3 text-3xl">
                Tu carrito esta vacio
            </h2>

            <p className="text-zinc-500 max-w-md mb-8">
                Agrega productos para comenzar tu pedido.
            </p>

            <Link
                href="/tienda"
                className="rounded-2xl bg-black px-8 py-4 font-semibold text-white transition hover:bg-zinc-800"
            >
                Explorar productos
            </Link>

            </div>

        )}
        
        <div className="hidden grid-cols-[minmax(320px,1fr)_120px_120px_120px_48px] items-center border-b border-zinc-300 px-2 py-3 text-sm font-bold uppercase tracking-wide text-black lg:grid">

            <p className="text-left">Producto</p>

            <p className="text-center">Precio</p>

            <p className="text-center">Cantidad</p>

            <p className="text-center">Subtotal</p>

            <div />

        </div>        

        {isCartReady && cart.map((item) => {
          const isCurveItem = isCurveProduct(item);
          const itemUnits = getCartItemUnits(item);
          const unitPrice = getCartItemUnitPrice(
            item,
            cartPricing.isWholesale
          );
          const itemSubtotal = getCartItemSubtotal(
            item,
            cartPricing.isWholesale
          );
          const currentProduct = currentProductsById.get(item.id);
          const selectedVariant = (
            currentProduct?.variants ?? item.variants
          )?.find((variant) => variant.color === item.selectedColor);
          const curveSizes = isCurveItem
            ? getCurveSizesFromVariant(selectedVariant)
            : [];
          const stockLimit = isCurveItem
            ? getCurveStockLimit({
                variant: selectedVariant,
              })
            : getVariantSizeStock({
                variants: currentProduct?.variants ?? item.variants,
                color: item.selectedColor,
                size: item.size,
              });
          const canIncrease =
            !isCheckingStock &&
            !stockError &&
            stockLimit > 0 &&
            item.quantity < stockLimit;

          return (

          <div
            key={`${item.id}-${item.selectedColor}-${item.size}`}
            className="relative grid grid-cols-1 items-center gap-4 border-b border-zinc-300 px-2 py-5 transition hover:bg-white/60 lg:grid-cols-[minmax(320px,1fr)_120px_120px_120px_48px] lg:gap-0"
          >

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">

                <Image
                    src={
                      item.selectedImage ||
                      item.images?.[0] ||
                      fallbackProductImage
                    }
                    alt={item.name}
                    width={112}
                    height={112}
                    className="h-24 w-24 shrink-0 rounded-2xl bg-zinc-100 object-cover sm:h-28 sm:w-28 lg:h-24 lg:w-24"
                />

                <div className="min-w-0">

                    <h2 className="font-brand line-clamp-2 text-2xl leading-tight text-zinc-950">
                      <Link
                        href={`/product/${item.slug}`}
                        className="cursor-pointer transition hover:text-zinc-600 hover:underline"
                      >
                        {item.name}
                        {isCurveItem ? " (CURVA)" : ""}
                      </Link>
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
                      {item.selectedColor && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1">
                          {item.selectedColor}
                        </span>
                      )}

                      {!isCurveItem && item.size && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1">
                          Talle {item.size}
                        </span>
                      )}

                      {isCurveItem && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1">
                          {itemUnits} prendas
                        </span>
                      )}
                    </div>

                </div>
              </div>

              {isCurveItem && curveSizes.length > 0 && (
                <div className="grid w-fit gap-1 rounded-2xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
                  {curveSizes.map((size) => (
                    <span
                      key={size}
                      className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-2.5 py-1"
                    >
                      Talle {size} x {item.quantity}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 lg:justify-center lg:border-0 lg:pt-0">
              <span className="text-sm font-semibold uppercase text-zinc-500 lg:hidden">
                Precio
              </span>

              <div className="text-right lg:text-center">
                <p className="text-lg font-bold text-zinc-950">
                  {formatPrice(unitPrice)}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">
                  {isCurveItem ? "por prenda" : "unitario"}
                </p>
              </div>

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 lg:flex-col lg:justify-center lg:border-0 lg:pt-0">
              <span className="text-sm font-semibold uppercase text-zinc-500 lg:hidden">
                Cantidad
              </span>

              <div className="flex w-fit items-center gap-1 rounded-xl border border-zinc-300 bg-white p-1 shadow-sm">

                <button
                    type="button"
                    onClick={() =>
                      removeFromCart(
                        item.id,
                        item.size,
                        item.selectedColor
                      )
                    }
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-zinc-200 text-zinc-950 transition hover:bg-zinc-300"
                >
                    <Minus size={16} />
                </button>

                <span className="min-w-6 text-center text-base font-bold">
                {item.quantity}
                </span>

                <button
                    type="button"
                    onClick={() =>
                      increaseQuantity(
                        item.id,
                        item.size,
                        item.selectedColor
                      )
                    }
                    disabled={!canIncrease}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-zinc-200 text-zinc-950 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                    <Plus size={16} />
                </button>

              </div>

              {!canIncrease && (
                <p className="text-right text-xs text-zinc-500 lg:text-center">
                  {stockLimit > 0
                    ? isCurveItem
                      ? "Curvas maximas en carrito"
                      : "Stock maximo en carrito"
                    : "Sin stock disponible"}
                </p>
              )}

            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 lg:justify-center lg:border-0 lg:pt-0">
              <span className="text-sm font-semibold uppercase text-zinc-500 lg:hidden">
                Subtotal
              </span>

              <div className="text-right lg:text-center">
                <p className="text-xl font-bold text-zinc-950">
                  {formatPrice(itemSubtotal)}
                </p>
                {isCurveItem && (
                  <p className="mt-0.5 text-xs font-medium text-zinc-500">
                    {itemUnits} prendas
                  </p>
                )}
              </div>

            </div>



            <button
              type="button"
              onClick={() =>
                deleteItem(
                  item.id,
                  item.size,
                  item.selectedColor
                )
              }
              className="ml-auto flex h-10 w-10 cursor-pointer items-center justify-center text-red-500 transition hover:text-red-700 lg:mx-auto"
            >
              <Trash2 size={18} />
            </button>
         
          </div>

          );
        })}

        </div>
        {isCartReady && cart.length > 0 && (

        <div className="sticky top-28 h-fit rounded-3xl border border-zinc-200 bg-white p-4 shadow-lg shadow-black/5 sm:p-5">

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-brand text-3xl">
                Resumen
              </h2>

              <div
                className={`min-w-[210px] rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  cartPricing.meetsWholesaleMinimum
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span>Min. {formatPrice(wholesaleMinimum)}</span>
                  <span>
                    {cartPricing.meetsWholesaleMinimum ? "OK" : "Falta"}
                  </span>
                </div>

                <span className="block h-2 overflow-hidden rounded-full bg-white">
                  <span
                    className={`block h-full rounded-full ${
                      cartPricing.meetsWholesaleMinimum
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${wholesaleProgress}%`,
                    }}
                  />
                </span>
              </div>

            </div>

            <div className="mb-5 divide-y divide-zinc-200">
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-base font-semibold text-zinc-900">
                  Subtotal
                </span>

                <span className="text-base font-medium text-zinc-950">
                  {formatPrice(cartPricing.wholesaleSubtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-base font-semibold text-zinc-900">
                  Transferencia 5%
                </span>

                <span className="text-base font-medium text-zinc-950">
                  {formatPrice(transferSurcharge)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-base font-semibold text-zinc-950">
                  Total
                </span>

                <span className="text-xl font-semibold text-zinc-950">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>

            {isCartReady &&
              cart.length > 0 &&
              !cartPricing.meetsWholesaleMinimum && (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  El minimo de compra es {formatPrice(wholesaleMinimum)}.
                </p>
              )}

            {(isCheckingStock || stockError) && (
              <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {isCheckingStock
                  ? "Validando stock actual..."
                  : stockError}
              </p>
            )}

            <Link
                href="/checkout"
                aria-disabled={isCheckoutBlocked}
                className={`flex w-full items-center justify-center py-4 font-semibold transition ${
                  isCheckoutBlocked
                    ? "pointer-events-none bg-zinc-300 text-zinc-500"
                    : "bg-black text-white hover:bg-zinc-800"
                }`}
            >
                {isCheckingStock
                  ? "Validando stock..."
                  : "Finalizar compra"}
            </Link>

        </div>

        )}

      </div>

    </div>
    </main>

  );
}

