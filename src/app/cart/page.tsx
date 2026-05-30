"use client";

import { useCart } from "@/context/CartContext";
import { fallbackProductImage } from "@/config/store";
import {
  getCartTotal,
  validateCartStock,
} from "@/lib/order";
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
  fulfillmentOptions,
  fulfillmentStorageKey,
  getFulfillmentFee,
  isFulfillmentOption,
  type FulfillmentOption,
} from "@/lib/fulfillment";
import {
  ArrowLeft,
  MapPin,
  Minus,
  Package,
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
  const [fulfillmentOption, setFulfillmentOption] =
    useState<FulfillmentOption | "">("");
  const fulfillmentFee = getFulfillmentFee(fulfillmentOption);
  const finalTotal = total + fulfillmentFee;
  const cartPricing = getCartPricing(cart);
  const wholesaleProgress = Math.min(
    (cartPricing.wholesaleSubtotal / wholesaleMinimum) * 100,
    100
  );
  const totalUnits = cart.reduce(
    (quantity, item) => quantity + item.quantity,
    0
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
  const isFulfillmentMissing =
    isCartReady && cart.length > 0 && !fulfillmentOption;
  const isCheckoutBlocked =
    isCheckingStock ||
    Boolean(stockError) ||
    isFulfillmentMissing;

  useEffect(() => {
    queueMicrotask(() => {
      const savedFulfillment = localStorage.getItem(
        fulfillmentStorageKey
      );

      if (isFulfillmentOption(savedFulfillment)) {
        setFulfillmentOption(savedFulfillment);
      }
    });
  }, []);

  const handleFulfillmentChange = (option: FulfillmentOption) => {
    setFulfillmentOption(option);
    localStorage.setItem(fulfillmentStorageKey, option);
  };

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

      <div className="mx-auto mt-3 max-w-7xl md:mt-5">

      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
              <ShoppingBag size={20} />
            </span>

            <h1 className="text-4xl font-bold">
              Carrito
            </h1>
          </div>

          <p className="mt-2 text-sm text-zinc-600">
            Revisa productos, cantidades y precio aplicado antes de finalizar.
          </p>
        </div>

        <Link
          href="/tienda"
          className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-zinc-800"
        >
          <ArrowLeft size={18} />
          Seguir comprando
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">
      <div className="flex flex-col gap-5">

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

            <h2 className="text-2xl font-semibold mb-3">
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
        
        <div className="hidden grid-cols-[1.8fr_.5fr_.7fr_.7fr_.2fr] gap-6 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:grid">

            <p>Producto</p>

            <p>Precio</p>

            <p>Cantidad</p>

            <p>Subtotal</p>

            <div />

        </div>        

        {isCartReady && cart.map((item) => {
          const unitPrice = getCartItemUnitPrice(
            item,
            cartPricing.isWholesale
          );
          const itemSubtotal = getCartItemSubtotal(
            item,
            cartPricing.isWholesale
          );
          const currentProduct = currentProductsById.get(item.id);
          const stockLimit = getVariantSizeStock({
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
            className="relative grid grid-cols-1 items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md lg:grid-cols-[1.8fr_.5fr_.7fr_.7fr_.2fr] lg:gap-6"
          >

            <div className="flex gap-4 items-center">

                <Image
                    src={
                      item.selectedImage ||
                      item.images?.[0] ||
                      fallbackProductImage
                    }
                    alt={item.name}
                    width={112}
                    height={112}
                    className="h-24 w-24 rounded-2xl bg-zinc-100 object-cover sm:h-28 sm:w-28"
                />

                <div>

                    <h2 className="text-lg font-semibold">
                      {item.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
                      {item.selectedColor && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1">
                          {item.selectedColor}
                        </span>
                      )}

                      {item.size && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1">
                          Talle {item.size}
                        </span>
                      )}
                    </div>

                </div>


            </div>

            <div className="flex items-center justify-between gap-3 lg:block">
              <span className="text-sm font-semibold uppercase text-zinc-500 lg:hidden">
                Precio
              </span>

              <p className="text-lg font-semibold">
                {formatPrice(unitPrice)}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {cartPricing.isWholesale ? "Mayorista" : "Minorista"}
              </p>
            </div>

            <div>

              <div className="flex w-fit items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-2 py-2">

                <button
                    type="button"
                    onClick={() =>
                      removeFromCart(
                        item.id,
                        item.size,
                        item.selectedColor
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white hover:text-black cursor-pointer"
                >
                    <Minus size={16} />
                </button>

                <span className="min-w-6 text-center font-semibold">
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
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white hover:text-black cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Plus size={16} />
                </button>

              </div>

              {!canIncrease && (
                <p className="mt-2 text-xs text-zinc-500">
                  {stockLimit > 0
                    ? "Stock maximo en carrito"
                    : "Sin stock disponible"}
                </p>
              )}

            </div>

            <div className="flex items-center justify-between gap-3 lg:block">
              <span className="text-sm font-semibold uppercase text-zinc-500 lg:hidden">
                Subtotal
              </span>

              <p className="text-lg font-semibold">
                {formatPrice(itemSubtotal)}
              </p>

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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100 hover:text-red-700 cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
         
          </div>

          );
        })}

        </div>
        {isCartReady && cart.length > 0 && (

        <div className="sticky top-28 h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-black/5">

            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Resumen
              </h2>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {cartPricing.isWholesale ? "Mayorista" : "Minorista"}
              </span>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm text-zinc-600">
            <span>Productos</span>
            <span>
              {cart.length} items / {totalUnits} unidades
            </span>
            </div>

            <div className="mb-3 flex items-center justify-between text-sm text-zinc-600">
            <span>Subtotal mayorista</span>
            <span>{formatPrice(cartPricing.wholesaleSubtotal)}</span>
            </div>

            <div className="mb-6 flex items-center justify-between text-sm text-zinc-600">
            <span>Subtotal minorista</span>
            <span>{formatPrice(cartPricing.retailSubtotal)}</span>
            </div>

            <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="mb-3 text-sm font-semibold text-zinc-900">
                Entrega
              </p>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => handleFulfillmentChange("pickup")}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${
                    fulfillmentOption === "pickup"
                      ? "border-black bg-white"
                      : "border-zinc-200 bg-white/70 hover:border-zinc-400"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                      <MapPin size={18} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">
                        {fulfillmentOptions.pickup.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {fulfillmentOptions.pickup.description}
                      </span>
                    </span>
                  </span>

                  <span className="text-sm font-semibold">
                    $0
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFulfillmentChange("shipping")}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${
                    fulfillmentOption === "shipping"
                      ? "border-black bg-white"
                      : "border-zinc-200 bg-white/70 hover:border-zinc-400"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                      <Package size={18} />
                    </span>

                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">
                        {fulfillmentOptions.shipping.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {fulfillmentOptions.shipping.description}
                      </span>
                    </span>
                  </span>

                  <span className="text-sm font-semibold">
                    +{formatPrice(fulfillmentOptions.shipping.fee)}
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-6">

            <div
              className={`mb-5 rounded-2xl p-4 text-sm leading-6 ${
                cartPricing.isWholesale
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              <span className="mb-3 block h-2 overflow-hidden rounded-full bg-white">
                <span
                  className={`block h-full rounded-full ${
                    cartPricing.isWholesale
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${wholesaleProgress}%`,
                  }}
                />
              </span>

              {cartPricing.isWholesale
                ? `Precio mayorista aplicado. Superaste el minimo de ${formatPrice(wholesaleMinimum)}.`
                : `Faltan ${formatPrice(cartPricing.remainingForWholesale)} para aplicar precio mayorista.`}

              {cartPricing.isWholesale && cartPricing.savings > 0 && (
                <span className="mt-2 block font-semibold">
                  Ahorras {formatPrice(cartPricing.savings)} con precio mayorista.
                </span>
              )}

              {!cartPricing.isWholesale && (
                <Link
                  href="/tienda"
                  className="mt-3 inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Agregar mas productos
                </Link>
              )}
            </div>

            <p className="mb-5 rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-600">
              No pagas online. Al finalizar, se genera el pedido para
              enviarlo por WhatsApp y coordinar el pago.
            </p>

            {fulfillmentOption && (
              <div className="mb-5 flex items-center justify-between text-sm text-zinc-600">
                <span>
                  Logistica y embalaje
                </span>
                <span>
                  {formatPrice(fulfillmentFee)}
                </span>
              </div>
            )}

            <div className="mb-6 flex items-end justify-between gap-4">

                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Total
                </span>

                <span className="text-3xl font-bold">
                {formatPrice(finalTotal)}
                </span>

            </div>

            {isFulfillmentMissing && (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Elegi una opcion de entrega para continuar.
              </p>
            )}

            {(isCheckingStock || stockError) && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {isCheckingStock
                  ? "Validando stock actual..."
                  : stockError}
              </p>
            )}

            <Link
                href="/checkout"
                aria-disabled={isCheckoutBlocked}
                className={`flex w-full items-center justify-center rounded-2xl py-4 font-semibold transition ${
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

        </div>

        )}

      </div>

    </div>
    </main>

  );
}

