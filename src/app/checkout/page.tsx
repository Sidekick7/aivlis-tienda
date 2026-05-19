"use client";

import { useCart } from "@/context/CartContext";
import { provinces } from "@/config/store";
import {
  buildWhatsAppUrl,
  formatCartItemsForWhatsApp,
  getCartItemLabel,
  getCartTotal,
} from "@/lib/order";
import { useState } from "react";

export default function CheckoutPage() {
  const { cart } = useCart();

  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [showError, setShowError] = useState(false);

  const total = getCartTotal(cart);
  const requiredFields = [
    name,
    dni,
    whatsapp,
    address,
    city,
    province,
    zip,
  ];
  const hasEmptyFields = requiredFields.some(
    (field) => !field.trim()
  );
  const hasNoProducts = cart.length === 0;

  const handleWhatsApp = () => {
    if (hasEmptyFields || hasNoProducts) {
      setShowError(true);
      return;
    }

    const message = `Hola! Quiero realizar este pedido:

${formatCartItemsForWhatsApp(cart)}

TOTAL: $${total}

DATOS DEL CLIENTE

Nombre y apellido:
${name}

DNI o CUIT:
${dni}

WhatsApp:
${whatsapp}

Direccion:
${address}

Localidad / Ciudad:
${city}

Provincia:
${province}

Codigo Postal:
${zip}

Correo electronico:
${email || "-"}

Notas adicionales:
${notes || "-"}`;

    window.open(buildWhatsAppUrl(message), "_blank");
  };

  return (
    <main className="min-h-screen bg-black text-white pt-32 px-6 md:px-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-10">
          Finalizar pedido
        </h1>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Nombre y apellido
            </p>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !name.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              DNI o CUIT
            </p>

            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !dni.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              WhatsApp
            </p>

            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !whatsapp.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Direccion calle y altura
            </p>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !address.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Localidad / Ciudad
            </p>

            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !city.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Provincia
            </p>

            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !province.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            >
              <option value="">
                Seleccionar provincia
              </option>

              {provinces.map((provinceName) => (
                <option key={provinceName}>
                  {provinceName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Codigo Postal / ZIP
            </p>

            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl p-4 outline-none ${
                showError && !zip.trim()
                  ? "border-red-500"
                  : "border-zinc-800"
              }`}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Correo electronico (opcional)
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-300">
              Notas adicionales (opcional)
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 outline-none min-h-[120px]"
            />
          </div>

          <div className="border-t border-zinc-800 pt-6 mt-4">
            <div className="flex flex-col gap-3 mb-6">
              {cart.length === 0 && (
                <p className="text-zinc-500 text-sm">
                  No hay productos en el carrito.
                </p>
              )}

              {cart.map((item) => (
                <div
                  key={`${item.id}-${item.selectedColor}-${item.size}`}
                  className="flex items-start justify-between gap-4 text-sm text-zinc-300"
                >
                  <div>
                    <p className="font-medium text-white">
                      {getCartItemLabel(item)}
                    </p>

                    <p className="text-zinc-500">
                      {item.quantity} x ${item.price}
                    </p>
                  </div>

                  <p className="font-semibold text-white">
                    ${item.price * item.quantity}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-2xl font-bold">
              Total: ${total}
            </p>

            {showError && hasEmptyFields && (
              <p className="mt-4 text-red-500 text-sm">
                Completa los campos obligatorios
              </p>
            )}

            {showError && hasNoProducts && (
              <p className="mt-4 text-red-500 text-sm">
                Agrega productos al carrito antes de finalizar
              </p>
            )}

            <button
              onClick={handleWhatsApp}
              disabled={hasNoProducts}
              className="mt-6 w-full bg-green-500 py-4 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
