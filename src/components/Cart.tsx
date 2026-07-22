"use client";

import Image from "next/image";
import Link from "next/link";
import { fallbackProductImage } from "@/config/store";
import { X } from "lucide-react";
import type { CartItem } from "@/context/CartContext";
import {
  getCurveSizesFromVariant,
  getCurveUnitsPerSet,
  isCurveProduct,
} from "@/lib/curve";
import {
  getCartTotal,
} from "@/lib/order";
import {
  formatPrice,
  getCartItemSubtotal,
  getCartItemUnitPrice,
  getCartPricing,
} from "@/lib/pricing";

type Props = {
  cart: CartItem[];
  isOpen: boolean;
  isCartReady: boolean;
  deleteItem: (
    id: number,
    size?: string,
    color?: string
  ) => void;
  onClose: () => void;
};

export default function Cart({
  cart,
  isOpen,
  isCartReady,
  deleteItem,
  onClose,
}: Props) {
  const total = getCartTotal(cart);
  const cartPricing = getCartPricing(cart);

  return (
    <div
      className={`fixed inset-0 z-[70] bg-black/65 transition-opacity duration-300 ease-out ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <aside
        className={`ml-auto flex h-full w-[calc(100%-3rem)] max-w-[360px] flex-col bg-white text-black shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-zinc-200 px-5">
          <h2 className="text-2xl font-black">
            Carrito
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-black transition hover:opacity-60"
            aria-label="Cerrar carrito"
          >
            <X size={20} />
            Cerrar
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!isCartReady && (
            <p className="px-5 py-6 text-sm font-semibold text-zinc-500">
              Cargando carrito...
            </p>
          )}

          {isCartReady && cart.length === 0 && (
            <p className="px-5 py-6 text-sm font-semibold text-zinc-500">
              No hay productos en el carrito.
            </p>
          )}

          {isCartReady &&
            cart.map((item) => (
              <CartDrawerItem
                key={`${item.id}-${item.selectedColor}-${item.size}`}
                item={item}
                isWholesale={cartPricing.isWholesale}
                deleteItem={deleteItem}
              />
            ))}
        </div>

        <footer className="shrink-0 border-t border-zinc-200 px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-2xl font-black">
              Subtotal:
            </p>
            <p className="text-2xl font-black tabular-nums">
              {formatPrice(total)}
            </p>
          </div>

          {!cartPricing.meetsWholesaleMinimum && cart.length > 0 && (
            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Faltan {formatPrice(cartPricing.remainingForWholesale)} para la
              compra mínima.
            </p>
          )}

          <div className="mt-5 grid gap-3">
            <Link
              href="/cart"
              onClick={onClose}
              aria-disabled={!isCartReady || cart.length === 0}
              className={`flex h-[52px] items-center justify-center bg-black text-center text-sm font-black uppercase text-white transition hover:bg-zinc-800 ${
                !isCartReady || cart.length === 0
                  ? "pointer-events-none opacity-40"
                  : ""
              }`}
            >
              Ver carrito
            </Link>

            <Link
              href="/checkout"
              onClick={onClose}
              aria-disabled={!isCartReady || cart.length === 0}
              className={`flex h-[52px] items-center justify-center bg-black text-center text-sm font-black uppercase text-white transition hover:bg-zinc-800 ${
                !isCartReady || cart.length === 0
                  ? "pointer-events-none opacity-40"
                  : ""
              }`}
            >
              Finalizar compra
            </Link>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function CartDrawerItem({
  item,
  isWholesale,
  deleteItem,
}: {
  item: CartItem;
  isWholesale: boolean;
  deleteItem: Props["deleteItem"];
}) {
  const isCurveItem = isCurveProduct(item);
  const selectedVariant = item.variants?.find(
    (variant) => variant.color === item.selectedColor
  );
  const curveSizes = isCurveItem
    ? getCurveSizesFromVariant(selectedVariant)
    : [];
  const curveUnitsPerSet = getCurveUnitsPerSet(selectedVariant);
  const unitPrice = getCartItemUnitPrice(item, isWholesale);
  const curveSetPrice = unitPrice * curveUnitsPerSet;

  return (
    <article className="grid grid-cols-[82px_minmax(0,1fr)_28px] gap-4 border-b border-zinc-200 px-5 py-5">
      <Image
        src={
          item.selectedImage ||
          item.images?.[0] ||
          fallbackProductImage
        }
        alt={item.name}
        width={82}
        height={102}
        className="h-[102px] w-[82px] rounded-sm bg-zinc-100 object-cover"
      />

      <div className="min-w-0 pt-1">
        <p className="truncate text-base font-black uppercase text-black">
          {item.name}
        </p>

        {isCurveItem ? (
          <>
            {item.selectedColor && (
              <p className="mt-1 text-xs font-bold uppercase text-zinc-500">
                {item.selectedColor}
              </p>
            )}
            <p className="mt-2 text-sm text-zinc-400">
              CURVA{" "}
              <span className="font-black text-black">
                {formatPrice(
                  item.quantity > 1
                    ? getCartItemSubtotal(item, isWholesale)
                    : curveSetPrice
                )}
              </span>
            </p>
            {item.quantity > 1 && (
              <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                {item.quantity} curvas × {formatPrice(curveSetPrice)}
              </p>
            )}
            <div className="mt-2 grid gap-0.5 text-xs font-bold uppercase text-zinc-600">
              {curveSizes.map((size) => (
                <span key={size}>
                  Talle {size} × {item.quantity}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-bold uppercase text-zinc-500">
              {item.size && <span>Talle {item.size}</span>}
              {item.selectedColor && <span>{item.selectedColor}</span>}
            </div>

            <p className="mt-2 text-base text-zinc-400">
              {item.quantity} ×{" "}
              <span className="font-black text-black">
                {formatPrice(unitPrice)}
              </span>
            </p>
          </>
        )}
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
        className="flex h-8 w-8 cursor-pointer items-start justify-center pt-1 text-zinc-500 transition hover:text-black"
        aria-label={`Eliminar ${item.name}`}
      >
        <X size={17} />
      </button>
    </article>
  );
}
