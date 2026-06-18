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
  getCartItemUnits,
  isCurveProduct,
} from "@/lib/curve";
import {
  formatPrice,
  getCartItemSubtotal,
  getCartItemUnitPrice,
  getCartPricing,
  wholesaleMinimum,
} from "@/lib/pricing";
import {
  createOrderNumber,
  createOrderTicket,
} from "@/lib/orders";
import { getProductsByIds } from "@/lib/products";
import { formatOrderNumber } from "@/lib/orderNumber";
import {
  fulfillmentOptions,
  fulfillmentStorageKey,
  getFulfillmentFee,
  isFulfillmentOption,
  type FulfillmentOption,
} from "@/lib/fulfillment";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types/product";

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

const fieldLabelClass =
  "mb-1.5 text-sm font-medium text-zinc-700";
const fieldBaseClass =
  "w-full rounded-2xl border bg-white px-4 py-3 text-black outline-none transition placeholder:text-zinc-400 focus:border-black";
const getRequiredFieldClass = (hasError: boolean) =>
  `${fieldBaseClass} ${
    hasError ? "border-red-500" : "border-zinc-300"
  }`;

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
  const [checkoutStockError, setCheckoutStockError] = useState("");
  const [isCheckingCartStock, setIsCheckingCartStock] =
    useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] =
    useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberCustomer, setRememberCustomer] = useState(false);
  const [fulfillmentOption, setFulfillmentOption] =
    useState<FulfillmentOption | "">("");
  const isSubmittingRef = useRef(false);

  useEffect(() => {

    queueMicrotask(() => {
      const savedFulfillment = localStorage.getItem(
        fulfillmentStorageKey
      );

      if (isFulfillmentOption(savedFulfillment)) {
        setFulfillmentOption(savedFulfillment);
      }

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
  const fulfillmentFee = getFulfillmentFee(fulfillmentOption);
  const finalTotal = total + fulfillmentFee;
  const selectedFulfillment = fulfillmentOption
    ? fulfillmentOptions[fulfillmentOption]
    : null;
  const requiresShippingData = fulfillmentOption === "shipping";
  const cartPricing = getCartPricing(cart);
  const requiredFields = requiresShippingData
    ? [name, dni, whatsapp, address, city, province, zip]
    : [name, dni, whatsapp];
  const hasEmptyFields = requiredFields.some(
    (field) => !field.trim()
  );
  const hasNoProducts = isCartReady && cart.length === 0;
  const hasNoFulfillment =
    isCartReady && cart.length > 0 && !fulfillmentOption;
  const isBelowMinimum =
    isCartReady &&
    cart.length > 0 &&
    !cartPricing.meetsWholesaleMinimum;
  const visibleOrderError = checkoutStockError || orderError;

  useEffect(() => {
    let isCurrent = true;

    if (!isCartReady || cart.length === 0) {
      queueMicrotask(() => {
        if (!isCurrent) return;

        setCheckoutStockError("");
        setIsCheckingCartStock(false);
      });

      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (!isCurrent) return;

      setIsCheckingCartStock(true);
      setCheckoutStockError("");
    });

    getProductsByIds(cart.map((item) => item.id))
      .then((currentProducts) => {
        if (!isCurrent) return;

        setCheckoutStockError(
          validateCartStock(cart, currentProducts) ?? ""
        );
      })
      .catch((error) => {
        if (!isCurrent) return;

        setCheckoutStockError(
          error instanceof Error
            ? `No se pudo validar el stock: ${error.message}`
            : "No se pudo validar el stock."
        );
      })
      .finally(() => {
        if (isCurrent) {
          setIsCheckingCartStock(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [cart, isCartReady]);

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
    if (createdOrderNumber || isSubmittingRef.current) return;

    if (
      hasEmptyFields ||
      hasNoProducts ||
      hasNoFulfillment ||
      isBelowMinimum
    ) {
      setShowError(true);
      return;
    }

    if (checkoutStockError || isCheckingCartStock) return;

    setOrderError("");
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    syncSavedCustomer();

    let currentProducts: Product[] = [];

    try {
      currentProducts = await getProductsByIds(
        cart.map((item) => item.id)
      );
      const stockError = validateCartStock(
        cart,
        currentProducts
      );

      if (stockError) {
        setOrderError(stockError);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? `No se pudo validar el stock: ${error.message}`
          : "No se pudo validar el stock."
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const currentProductsById = new Map(
      currentProducts.map((product) => [product.id, product])
    );
    const enrichedCart = cart.map((item) => {
      const currentProduct = currentProductsById.get(item.id);

      return {
        ...item,
        sku: currentProduct?.sku || item.sku,
        price: currentProduct?.price ?? item.price,
        retailPrice: currentProduct?.retailPrice ?? item.retailPrice,
        images: currentProduct?.images ?? item.images,
        variants: currentProduct?.variants ?? item.variants,
      };
    });
    const enrichedTotal = getCartTotal(enrichedCart);
    const enrichedFulfillmentFee =
      getFulfillmentFee(fulfillmentOption);
    const enrichedFinalTotal =
      enrichedTotal + enrichedFulfillmentFee;

    if (enrichedTotal < wholesaleMinimum) {
      setOrderError(
        `El minimo de compra es ${formatPrice(wholesaleMinimum)}.`
      );
      return;
    }

    const orderNumber = createOrderNumber();
    const customer = {
      name,
      dni,
      whatsapp,
      address: requiresShippingData ? address : "",
      city: requiresShippingData ? city : "",
      province: requiresShippingData ? province : "",
      zip: requiresShippingData ? zip : "",
      email,
      notes: notes.trim(),
    };
    const fulfillmentLabel =
      fulfillmentOption === "pickup"
        ? "Retiro presencial"
        : "Despacho a transporte, correo, expreso";
    const ticketNotes = [
      selectedFulfillment ? `Entrega: ${fulfillmentLabel}` : "",
      notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    const ticketCustomer = {
      ...customer,
      notes: ticketNotes,
    };
    const message = buildOrderWhatsAppMessage({
      orderNumber,
      cart: enrichedCart,
      customer,
      fulfillment: selectedFulfillment
        ? {
            label:
              fulfillmentOption === "pickup"
                ? "Retiro presencial"
                : "Despacho a transporte, correo, expreso",
            description:
              fulfillmentOption === "pickup"
                ? "Yerbal 3160, Flores. Retiro una vez confirmado el pedido abonado y armado."
                : "Costo de entrega a logistica y embalaje. Envio final a cargo del cliente segun peso y distancia.",
            fee: enrichedFulfillmentFee,
          }
        : undefined,
      total: enrichedFinalTotal,
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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      await createOrderTicket({
        orderNumber,
        cart: enrichedCart,
        customer: ticketCustomer,
        total: enrichedFinalTotal,
        whatsappMessage: message,
      });

      window.open(whatsappUrl, "_blank");
      setCreatedOrderNumber(orderNumber);
      localStorage.removeItem(fulfillmentStorageKey);
      clearCart();
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? `No se pudo crear el ticket: ${error.message}`
          : "No se pudo crear el ticket. Revisa Supabase."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 px-6 pb-16 text-black md:px-10">
      <div className="mx-auto mt-4 max-w-3xl md:mt-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Finalizar pedido
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Completa tus datos para generar el ticket y enviarlo por
              WhatsApp. El pago se coordina afuera de la tienda.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex h-11 w-fit items-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
          >
            Volver al carrito
          </Link>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className={fieldLabelClass}>
              Nombre y apellido
            </p>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={getRequiredFieldClass(
                showError && !name.trim()
              )}
            />
          </div>

          <div>
            <p className={fieldLabelClass}>
              DNI o CUIT
            </p>

            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className={getRequiredFieldClass(
                showError && !dni.trim()
              )}
            />
          </div>

          <div>
            <p className={fieldLabelClass}>
              WhatsApp
            </p>

            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={getRequiredFieldClass(
                showError && !whatsapp.trim()
              )}
            />
          </div>

          {fulfillmentOption === "pickup" && (
            <div className="rounded-2xl bg-zinc-100 p-3 text-sm leading-5 text-zinc-600">
              Para retiro presencial solo necesitamos nombre, DNI/CUIT y
              WhatsApp. El retiro se coordina cuando el pedido este abonado
              y armado.
            </div>
          )}

          {requiresShippingData && (
            <>
              <div className="rounded-2xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-700">
                Datos para despacho
              </div>

              <div>
                <p className={fieldLabelClass}>
                  Direccion calle y altura
                </p>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={getRequiredFieldClass(
                    showError && !address.trim()
                  )}
                />
              </div>

              <div>
                <p className={fieldLabelClass}>
                  Localidad / Ciudad
                </p>

                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={getRequiredFieldClass(
                    showError && !city.trim()
                  )}
                />
              </div>

              <div>
                <p className={fieldLabelClass}>
                  Provincia
                </p>

                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={getRequiredFieldClass(
                    showError && !province.trim()
                  )}
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
                <p className={fieldLabelClass}>
                  Codigo Postal / ZIP
                </p>

                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className={getRequiredFieldClass(
                    showError && !zip.trim()
                  )}
                />
              </div>
            </>
          )}

          <div>
            <p className={fieldLabelClass}>
              Correo electrónico (opcional)
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${fieldBaseClass} border-zinc-300`}
            />
          </div>

          <div>
            <p className={fieldLabelClass}>
              Notas adicionales (opcional)
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${fieldBaseClass} min-h-24 resize-y border-zinc-300`}
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={rememberCustomer}
              onChange={(e) =>
                setRememberCustomer(e.target.checked)
              }
              className="h-4 w-4 accent-black"
            />
            Recordar mis datos para próximos pedidos
          </label>

          <div className="mt-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4 flex flex-col gap-3">
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

              {isCartReady && cart.map((item) => {
                const isCurveItem = isCurveProduct(item);
                const itemUnits = getCartItemUnits(item);

                return (
                  <div
                    key={`${item.id}-${item.selectedColor}-${item.size}`}
                    className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3 text-sm last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-black">
                        {getCartItemLabel(item)}
                      </p>

                      <div className="mt-1 text-zinc-500">
                        <span>
                          {isCurveItem
                            ? `${item.quantity} ${
                                item.quantity === 1 ? "curva" : "curvas"
                              } (${itemUnits} prendas) x `
                            : `${item.quantity} x `}
                          {formatPrice(
                            getCartItemUnitPrice(
                              item,
                              cartPricing.isWholesale
                            )
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-black">
                        {formatPrice(
                          getCartItemSubtotal(
                            item,
                            cartPricing.isWholesale
                          )
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p
              className={`mb-3 rounded-2xl p-3 text-sm leading-5 ${
                cartPricing.meetsWholesaleMinimum
                  ? "bg-green-500/10 text-green-700"
                  : "bg-yellow-500/10 text-yellow-800"
              }`}
            >
              {cartPricing.meetsWholesaleMinimum
                ? "Minimo de compra alcanzado."
                : `Faltan ${formatPrice(cartPricing.remainingForWholesale)} para alcanzar el minimo de compra de ${formatPrice(wholesaleMinimum)}.`}


            </p>

            <p className="mb-3 rounded-2xl bg-white p-3 text-sm leading-5 text-zinc-600">
              No pagas online. Este paso crea el pedido, reserva el
              stock y abre WhatsApp para confirmar los datos.
            </p>

            {selectedFulfillment ? (
              <div className="mb-3 rounded-2xl bg-white p-3 text-sm leading-5 text-zinc-600">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-zinc-900">
                    {fulfillmentOption === "pickup"
                      ? "Retiro presencial"
                      : "Despacho a transporte, correo, expreso"}
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {formatPrice(fulfillmentFee)}
                  </span>
                </div>

                <p className="mt-2">
                  {fulfillmentOption === "pickup"
                    ? "Yerbal 3160, Flores. Se retira una vez confirmado el pedido abonado y armado."
                    : "Costo de entrega a logistica y embalaje. El envio final queda a cargo del cliente segun peso y distancia."}
                </p>

                <Link
                  href="/cart"
                  className="mt-2 inline-flex h-9 items-center rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
                >
                  Cambiar entrega
                </Link>
              </div>
            ) : (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-800">
                Elegi una opcion de entrega desde el carrito antes de finalizar.

                <Link
                  href="/cart"
                  className="mt-2 inline-flex h-9 items-center rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Elegir entrega
                </Link>
              </div>
            )}

            <p className="rounded-2xl bg-white p-3 text-2xl font-bold">
              Total: {formatPrice(finalTotal)}
            </p>

            {showError && hasEmptyFields && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
                Completa los campos obligatorios.
              </p>
            )}

            {showError && hasNoProducts && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
                Agrega productos al carrito antes de finalizar.
              </p>
            )}

            {showError && hasNoFulfillment && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
                Elegi una opcion de entrega para continuar.
              </p>
            )}

            {isBelowMinimum && (
              <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                El minimo de compra es {formatPrice(wholesaleMinimum)}.
                Faltan {formatPrice(cartPricing.remainingForWholesale)}.
              </p>
            )}

            {isCheckingCartStock && (
              <p className="mt-4 rounded-xl bg-white p-3 text-sm text-zinc-600">
                Validando stock actual...
              </p>
            )}

            {visibleOrderError && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
                <p>{visibleOrderError}</p>

                <Link
                  href="/cart"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 font-semibold text-white transition hover:bg-zinc-800"
                >
                  Revisar carrito
                </Link>
              </div>
            )}

            {createdOrderNumber && (
              <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-800">
                <p>
                  Pedido {formatOrderNumber(createdOrderNumber)} creado. Ya abrimos WhatsApp para enviar el pedido.
                </p>

                <Link
                  href="/"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 font-semibold text-white transition hover:bg-zinc-800"
                >
                  Seguir comprando
                </Link>
              </div>
            )}

            <button
              onClick={handleWhatsApp}
              disabled={
                hasNoProducts ||
                hasNoFulfillment ||
                isBelowMinimum ||
                !isCartReady ||
                isSubmitting ||
                isCheckingCartStock ||
                Boolean(checkoutStockError) ||
                Boolean(createdOrderNumber)
              }
              className="mt-4 w-full rounded-2xl bg-green-500 py-4 font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
            >
              {createdOrderNumber
                ? "Ticket creado"
                : isSubmitting
                  ? "Creando ticket..."
                  : isCheckingCartStock
                    ? "Validando stock..."
                  : "Enviar pedido por WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
