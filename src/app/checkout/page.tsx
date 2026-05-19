"use client";

import { useCart } from "@/context/CartContext";
import { provinces } from "@/config/store";
import Link from "next/link";
import {
  buildWhatsAppUrl,
  buildOrderWhatsAppMessage,
  getCartItemLabel,
  getCartTotal,
  validateCartStock,
} from "@/lib/order";
import {
  createOrderNumber,
  createOrderTicket,
} from "@/lib/orders";
import { getProductsByIds } from "@/lib/products";
import { useEffect, useState } from "react";

const checkoutCustomerStorageKey = "checkout_customer";

type SavedCheckoutCustomer = {
  name: string;
  dni: string;
  whatsapp: string;
  address: string;
  city: string;
  province: string;
  zip: string;
  email: string;
};

export default function CheckoutPage() {
  const { cart, clearCart, isCartReady } = useCart();

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
  const [orderError, setOrderError] = useState("");
  const [createdOrderNumber, setCreatedOrderNumber] =
    useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberCustomer, setRememberCustomer] = useState(false);

  useEffect(() => {

    queueMicrotask(() => {
      const savedCustomer = localStorage.getItem(
        checkoutCustomerStorageKey
      );

      if (!savedCustomer) return;

      try {
        const customer = JSON.parse(
          savedCustomer
        ) as SavedCheckoutCustomer;

        setName(customer.name || "");
        setDni(customer.dni || "");
        setWhatsapp(customer.whatsapp || "");
        setAddress(customer.address || "");
        setCity(customer.city || "");
        setProvince(customer.province || "");
        setZip(customer.zip || "");
        setEmail(customer.email || "");
        setRememberCustomer(true);
      } catch {
        localStorage.removeItem(checkoutCustomerStorageKey);
      }
    });

  }, []);

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
  const hasNoProducts = isCartReady && cart.length === 0;

  const syncSavedCustomer = () => {
    if (rememberCustomer) {
      const customerToSave: SavedCheckoutCustomer = {
        name,
        dni,
        whatsapp,
        address,
        city,
        province,
        zip,
        email,
      };

      localStorage.setItem(
        checkoutCustomerStorageKey,
        JSON.stringify(customerToSave)
      );
    } else {
      localStorage.removeItem(checkoutCustomerStorageKey);
    }
  };

  const handleWhatsApp = async () => {
    if (createdOrderNumber) return;

    if (hasEmptyFields || hasNoProducts) {
      setShowError(true);
      return;
    }

    setOrderError("");
    setIsSubmitting(true);
    syncSavedCustomer();

    try {
      const currentProducts = await getProductsByIds(
        cart.map((item) => item.id)
      );
      const stockError = validateCartStock(
        cart,
        currentProducts
      );

      if (stockError) {
        setOrderError(stockError);
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? `No se pudo validar el stock: ${error.message}`
          : "No se pudo validar el stock."
      );
      setIsSubmitting(false);
      return;
    }

    const orderNumber = createOrderNumber();
    const customer = {
      name,
      dni,
      whatsapp,
      address,
      city,
      province,
      zip,
      email,
      notes,
    };
    const message = buildOrderWhatsAppMessage({
      orderNumber,
      cart,
      customer,
      total,
    });
    let whatsappUrl = "";

    try {
      whatsappUrl = buildWhatsAppUrl(message);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "No se pudo preparar el enlace de WhatsApp."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await createOrderTicket({
        orderNumber,
        cart,
        customer,
        total,
        whatsappMessage: message,
      });

      window.open(whatsappUrl, "_blank");
      setCreatedOrderNumber(orderNumber);
      clearCart();
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? `No se pudo crear el ticket: ${error.message}`
          : "No se pudo crear el ticket. Revisa Supabase."
      );
    } finally {
      setIsSubmitting(false);
    }
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

              {provinces.map((provinceName) => (
                <option key={provinceName}>
                  {provinceName}
                </option>
              ))}
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

          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={rememberCustomer}
              onChange={(e) =>
                setRememberCustomer(e.target.checked)
              }
              className="w-4 h-4 accent-white"
            />
            Recordar mis datos para proximos pedidos
          </label>

          <div className="border-t border-zinc-800 pt-6 mt-4">
            <div className="flex flex-col gap-3 mb-6">
              {!isCartReady && (
                <p className="text-zinc-500 text-sm">
                  Cargando carrito...
                </p>
              )}

              {isCartReady && cart.length === 0 && (
                <p className="text-zinc-500 text-sm">
                  No hay productos en el carrito.
                </p>
              )}

              {isCartReady && cart.map((item) => (
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

            {orderError && (
              <p className="mt-4 text-red-500 text-sm">
                {orderError}
              </p>
            )}

            {createdOrderNumber && (
              <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300 text-sm">
                <p>
                  Ticket {createdOrderNumber} creado. Ya abrimos WhatsApp para enviar el pedido.
                </p>

                <Link
                  href="/"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 font-semibold text-black transition hover:opacity-90"
                >
                  Seguir comprando
                </Link>
              </div>
            )}

            <button
              onClick={handleWhatsApp}
              disabled={
                hasNoProducts ||
                !isCartReady ||
                isSubmitting ||
                Boolean(createdOrderNumber)
              }
              className="mt-6 w-full bg-green-500 py-4 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {createdOrderNumber
                ? "Ticket creado"
                : isSubmitting
                  ? "Creando ticket..."
                  : "Enviar pedido por WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
