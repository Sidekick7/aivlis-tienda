"use client";

import { useCart } from "@/context/CartContext";
import { fallbackProductImage } from "@/config/store";
import { getCartTotal } from "@/lib/order";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function CartPage() {

const {
  cart,
  removeFromCart,
  increaseQuantity,
  deleteItem,
  isCartReady,
} = useCart();

  const total = getCartTotal(cart);

  return (

    <main className="min-h-screen bg-black text-white pt-32 px-6">

      <div className="max-w-7xl mx-auto">

      <h1 className="text-4xl font-bold mb-10">
        Carrito
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">
      <div className="flex flex-col gap-5">

        {!isCartReady && (
          <div className="flex flex-col items-center justify-center border border-zinc-800 rounded-3xl py-24 px-6 text-center">
            <p className="text-zinc-500">
              Cargando carrito...
            </p>
          </div>
        )}

        {isCartReady && cart.length === 0 && (

          <div className="flex flex-col items-center justify-center border border-zinc-800 rounded-3xl py-24 px-6 text-center">

            <div className="w-20 h-20 rounded-full border border-zinc-800 flex items-center justify-center mb-6">

                <Trash2
                size={30}
                className="text-zinc-500"
                />

            </div>

            <h2 className="text-2xl font-semibold mb-3">
                Tu carrito está vacío
            </h2>

            <p className="text-zinc-500 max-w-md mb-8">
                Agregá productos para comenzar tu pedido mayorista.
            </p>

            <Link
                href="/"
                className="bg-white text-black px-8 py-4 rounded-2xl font-semibold hover:opacity-90 transition"
            >
                Explorar productos
            </Link>

            </div>

        )}
        
        <div className="hidden lg:grid grid-cols-[1.8fr_.5fr_.7fr_.7fr_.2fr] gap-6 px-4 pb-4 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">

            <p>Producto</p>

            <p>Precio</p>

            <p>Cantidad</p>

            <p>Subtotal</p>

            <div />

        </div>        

        {isCartReady && cart.map((item, index) => (

          <div
            key={index}
            className="grid grid-cols-1 lg:grid-cols-[1.8fr_.5fr_.7fr_.7fr_.2fr] gap-6 items-center border-b border-zinc-800 py-6"
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
                    className="w-28 h-28 object-cover rounded-2xl"
                />

                <div>

                    <h2 className="text-lg font-semibold">
                      {item.name}
                    </h2>

                    <p className="text-zinc-500 text-sm mt-1">
                      {item.selectedColor}

                      {item.size &&
                        ` / ${item.size}`}
                    </p>

                    <p className="text-zinc-500 text-sm mt-2">
                    Producto agregado al carrito
                    </p>

                </div>


            </div>

            <div>
              <p className="text-lg font-semibold">
                ${item.price}
              </p>
            </div>

            <div>

              <div className="flex items-center gap-4 border border-zinc-800 rounded-xl px-4 py-2 w-fit">

                <button
                    onClick={() =>
                      removeFromCart(
                        item.id,
                        item.size,
                        item.selectedColor
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
                >
                    -
                </button>

                <span>
                {item.quantity}
                </span>

                <button
                    onClick={() =>
                      increaseQuantity(
                        item.id,
                        item.size,
                        item.selectedColor
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
                >
                    +
                </button>

              </div>

            </div>

            <div>

              <p className="text-lg font-semibold">
                ${item.price * item.quantity}
              </p>

            </div>



            <button
              onClick={() =>
                deleteItem(
                  item.id,
                  item.size,
                  item.selectedColor
                )
              }
              className="text-zinc-400 hover:text-red-400 transition"
            >
              <Trash2 />
            </button>
         
          </div>

        ))}

        </div>
        {isCartReady && cart.length > 0 && (

        <div className="sticky top-28 border border-zinc-800 rounded-3xl p-6 h-fit">

            <h2 className="text-2xl font-bold mb-6">
            Resumen
            </h2>

            <div className="flex items-center justify-between text-zinc-400 mb-4">
            <span>Productos</span>
            <span>{cart.length}</span>
            </div>

            <div className="flex items-center justify-between text-zinc-400 mb-6">
            <span>Subtotal</span>
            <span>${total}</span>
            </div>

            <div className="border-t border-zinc-800 pt-6">

            <div className="flex items-center justify-between mb-6">

                <span className="text-lg">
                Total
                </span>

                <span className="text-3xl font-bold">
                ${total}
                </span>

            </div>

            <Link
                href="/checkout"
                className="w-full flex items-center justify-center bg-white text-black py-4 rounded-2xl font-semibold hover:opacity-90 transition"
            >
                Finalizar compra
            </Link>

            </div>

        </div>

        )}

      </div>

    </div>
    </main>

  );
}

