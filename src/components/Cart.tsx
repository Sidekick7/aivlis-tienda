"use client";

import { Trash2 } from "lucide-react";

type Props = {
  cart: any[];
  removeFromCart: (id: number) => void;
  onClose: () => void;
};

export default function Cart({
  cart,
  removeFromCart,
  onClose,
}: Props) {

  const total = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const sendWhatsApp = () => {

    const message = cart
      .map(
        (item) =>
          `• ${item.name} x${item.quantity} - $${item.price}`
      )
      .join("%0A");

    const url =
      `https://wa.me/5491158501082?text=Hola! Quiero hacer este pedido:%0A%0A${message}`;

    window.open(url, "_blank");
  };

  return (
    <div className="w-[340px] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-zinc-400"
      >
        ✕
        </button>
      <h2 className="text-2xl font-bold mb-4">
        Carrito
      </h2>

      <div className="flex flex-col gap-3">

        {cart.length === 0 && (
          <p className="text-zinc-400">
            No hay productos
          </p>
        )}

        {cart.map((item, index) => (
          <div
            key={index}
            className="flex gap-3 bg-zinc-800 p-3 rounded-2xl"
          >

            <img
              src={item.images?.[0]}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-xl"
            />

            <div className="flex-1">

              <p className="font-semibold leading-tight">
                {item.name}
              </p>

              {item.size && (
                <p className="text-sm text-zinc-400 mt-1">
                  Talle: {item.size}
                </p>
              )}

              <p className="text-sm text-zinc-400 mt-1">
                Cantidad: {item.quantity}
              </p>

              <p className="text-sm mt-1">
                ${item.price}
              </p>

              <button
                onClick={() => removeFromCart(item.id)}
                className="mt-3 text-zinc-400 hover:text-red-400 transition"
              >
                <Trash2 size={18} />
              </button>

            </div>

          </div>
        ))}

      </div>

      <div className="mt-5 border-t border-zinc-700 pt-4">

        <p className="text-lg font-bold">
          Total: ${total}
        </p>

      </div>

      <button
        onClick={sendWhatsApp}
        className="w-full mt-5 bg-green-500 py-3 rounded-xl font-bold hover:opacity-90 transition"
      >
        Enviar por WhatsApp
      </button>

    </div>
  );
}