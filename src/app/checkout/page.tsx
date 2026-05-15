"use client";

import { useCart } from "@/context/CartContext";
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

const [showError, setShowError] =
  useState(false);

  const total = cart.reduce(
    (acc, item) =>
      acc + item.price * item.quantity,
    0
  );

  const requiredFields = [
    name,
    dni,
    whatsapp,
    address,
    city,
    province,
    zip,
  ];

  const hasEmptyFields =
    requiredFields.some(
       (field) => !field.trim()
    );

  const handleWhatsApp = () => {
    if (hasEmptyFields) {

        setShowError(true);

        return;

    }

    const products = cart
      .map(
        (item) =>
          `• ${item.name} ${item.size ? `(${item.size})` : ""}
x${item.quantity}
$${item.price}`
      )
      .join("\n\n");

    const message = `
    Hola! Quiero realizar este pedido:

    ${products}

    TOTAL: $${total}

    DATOS DEL CLIENTE

    Nombre y apellido:
    ${name}

    DNI o CUIT:
    ${dni}

    WhatsApp:
    ${whatsapp}

    Dirección:
    ${address}

    Localidad / Ciudad:
    ${city}

    Provincia:
    ${province}

    Código Postal:
    ${zip}

    Correo electrónico:
    ${email || "-"}

    Notas adicionales:
    ${notes || "-"}
    `;

    const url =
      `https://wa.me/5491158501082?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");

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
            Dirección calle y altura
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

            <option>Buenos Aires</option>
            <option>Ciudad Autónoma de Buenos Aires</option>
            <option>Catamarca</option>
            <option>Chaco</option>
            <option>Chubut</option>
            <option>Córdoba</option>
            <option>Corrientes</option>
            <option>Entre Ríos</option>
            <option>Formosa</option>
            <option>Jujuy</option>
            <option>La Pampa</option>
            <option>La Rioja</option>
            <option>Mendoza</option>
            <option>Misiones</option>
            <option>Neuquén</option>
            <option>Río Negro</option>
            <option>Salta</option>
            <option>San Juan</option>
            <option>San Luis</option>
            <option>Santa Cruz</option>
            <option>Santa Fe</option>
            <option>Santiago del Estero</option>
            <option>Tierra del Fuego</option>
            <option>Tucumán</option>

        </select>

        </div>

        <div>

        <p className="mb-2 text-sm text-zinc-300">
            Código Postal / ZIP
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
            Correo electrónico (opcional)
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

            <p className="text-2xl font-bold">
              Total: ${total}
            </p>

            {showError && hasEmptyFields && (

                <p className="mt-4 text-red-500 text-sm">
                    ⚠️ Completá los campos obligatorios
                </p>

            )}

            <button
              onClick={handleWhatsApp}
              className="mt-6 w-full bg-green-500 py-4 rounded-xl font-semibold hover:opacity-90 transition"
            >
              Enviar pedido por WhatsApp
            </button>

          </div>

        </div>

      </div>

    </main>

  );
}
