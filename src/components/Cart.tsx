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
    <div className="w-[330px] bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-zinc-400"
      >
        ✕
        </button>

      <div className="flex flex-col gap-3">

        {cart.length === 0 && (
          <p className="text-zinc-400">
            No hay productos
          </p>
        )}

        {cart.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-4 py-4 border-b border-zinc-800"
          >

            <img
              src={item.images?.[0]}
              alt={item.name}
              className="w-16 h-16 object-cover rounded-md bg-white"
            />

            <div className="flex-1">

              <p className="text-red-500 uppercase text-sm leading-tight font-medium">
                {item.name}

                {item.size && ` - ${item.size}`}
              </p>

              <p className="text-zinc-300 mt-2 text-sm">
                {item.quantity} × ${item.price}
              </p>

            </div>

            <button
              onClick={() => removeFromCart(item.id)}
              className="text-zinc-400 hover:text-white transition"
            >
              <Trash2 size={18} />
            </button>

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