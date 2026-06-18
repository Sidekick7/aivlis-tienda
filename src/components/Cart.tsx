"use client";

import Image from "next/image";
import Link from "next/link";
import { fallbackProductImage } from "@/config/store";
import { Trash2 } from "lucide-react";
import type { CartItem } from "@/context/CartContext";
import {
  getCartItemLabel,
  getCartTotal,
} from "@/lib/order";
import {
  formatPrice,
  getCartItemUnitPrice,
  getCartPricing,
} from "@/lib/pricing";

type Props = {
  cart: CartItem[];
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
  isCartReady,
  deleteItem,
  onClose,
}: Props) {
  const total = getCartTotal(cart);
  const cartPricing = getCartPricing(cart);

  return (
    <div className="w-[330px] bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 text-zinc-400"
      >
        x
      </button>

      <div className="flex flex-col gap-3">
        {!isCartReady && (
          <p className="text-zinc-400">
            Cargando carrito...
          </p>
        )}

        {isCartReady && cart.length === 0 && (
          <p className="text-zinc-400">
            No hay productos en el carrito.
          </p>
        )}

        {isCartReady && cart.map((item) => (
          <div
            key={`${item.id}-${item.selectedColor}-${item.size}`}
            className="flex items-start gap-4 py-4 border-b border-zinc-800"
          >
            <Image
              src={
                item.selectedImage ||
                item.images?.[0] ||
                fallbackProductImage
              }
              alt={item.name}
              width={64}
              height={64}
              className="w-16 h-16 object-cover rounded-md bg-white"
            />

            <div className="flex-1">
              <p className="text-red-500 uppercase text-sm leading-tight font-medium">
                {getCartItemLabel(item)}
              </p>

              <p className="text-zinc-300 mt-2 text-sm">
                {item.quantity} x{" "}
                {formatPrice(
                  getCartItemUnitPrice(item, cartPricing.isWholesale)
                )}
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
              className="text-zinc-400 hover:text-white transition"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-zinc-700 pt-4">
        <p className="text-lg font-bold">
          Total: {formatPrice(total)}
        </p>

        <p className="mt-1 text-xs text-zinc-400">
          {cartPricing.meetsWholesaleMinimum
            ? "Minimo de compra alcanzado"
            : `Faltan ${formatPrice(cartPricing.remainingForWholesale)} para el minimo`}
        </p>
      </div>

      <Link
        href="/cart"
        onClick={onClose}
        aria-disabled={!isCartReady || cart.length === 0}
        className={`w-full mt-5 text-center py-3 rounded-xl font-bold transition ${
          !isCartReady || cart.length === 0
            ? "bg-zinc-700 text-zinc-400 pointer-events-none"
            : "bg-white text-black hover:opacity-90"
        }`}
      >
        Ir al carrito
      </Link>
    </div>
  );
}
