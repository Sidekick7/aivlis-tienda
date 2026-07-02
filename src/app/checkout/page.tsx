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
  getCurveSizesFromVariant,
  isCurveProduct,
} from "@/lib/curve";
import {
  formatPrice,
  getCartItemSubtotal,
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
const transferSurchargeRate = 0.05;

type CheckoutPaymentMethod =
  | "cash"
  | "transfer";

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
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod | "">("");
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
  const orderBaseTotal = total + fulfillmentFee;
  const paymentSurcharge =
    paymentMethod === "transfer"
      ? Math.round(orderBaseTotal * transferSurchargeRate)
      : 0;
  const finalTotal = orderBaseTotal + paymentSurcharge;
  const selectedPaymentLabel =
    paymentMethod === "transfer"
      ? "Transferencia"
      : paymentMethod === "cash"
        ? "Efectivo"
        : "";
  const selectedFulfillment = fulfillmentOption
    ? fulfillmentOptions[fulfillmentOption]
    : null;
  const cartPricing = getCartPricing(cart);
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
  const hasNoFulfillment =
    isCartReady && cart.length > 0 && !fulfillmentOption;
  const hasNoPayment =
    isCartReady && cart.length > 0 && !paymentMethod;
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
      hasNoPayment ||
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
    const enrichedOrderBaseTotal =
      enrichedTotal + enrichedFulfillmentFee;
    const enrichedPaymentSurcharge =
      paymentMethod === "transfer"
        ? Math.round(
            enrichedOrderBaseTotal * transferSurchargeRate
          )
        : 0;
    const enrichedFinalTotal =
      enrichedOrderBaseTotal + enrichedPaymentSurcharge;

    if (enrichedTotal < wholesaleMinimum) {
      setOrderError(
        `El minimo de compra es ${formatPrice(wholesaleMinimum)}.`
      );
      isSubmittingRef.current = false;
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
      notes: notes.trim(),
    };
    const fulfillmentLabel =
      fulfillmentOption === "pickup"
        ? "Retiro presencial"
        : "Despacho a transporte, correo, expreso";
    const ticketNotes = [
      selectedFulfillment ? `Entrega: ${fulfillmentLabel}` : "",
      selectedPaymentLabel
        ? `Pago: ${selectedPaymentLabel}${
            enrichedPaymentSurcharge > 0
              ? ` (+5% ${formatPrice(enrichedPaymentSurcharge)})`
              : ""
          }`
        : "",
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
      payment: selectedPaymentLabel
        ? {
            label: selectedPaymentLabel,
            surcharge: enrichedPaymentSurcharge,
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
      <div className="mx-auto mt-4 max-w-7xl md:mt-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Finalizar pedido
            </h1>

          </div>

          <Link
            href="/cart"
            className="inline-flex h-11 w-fit items-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
          >
            Volver al carrito
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,620px)_430px] lg:justify-center lg:items-start">
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
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

          <div className="rounded-2xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-700">
            Datos de entrega
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

        </div>

          <aside className="sticky top-28 mx-auto w-full max-w-[430px] rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">
              Mi pedido
            </h2>

            <div className="mb-4 flex flex-col gap-3">
              {isCartReady && cart.length > 0 && (
                <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-4 border-b border-zinc-300 pb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  <span>Producto</span>
                  <span className="text-right">Subtotal</span>
                </div>
              )}

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
                const selectedVariant = item.variants?.find(
                  (variant) => variant.color === item.selectedColor
                );
                const curveSizes = isCurveItem
                  ? getCurveSizesFromVariant(selectedVariant)
                  : [];

                return (
                  <div
                    key={`${item.id}-${item.selectedColor}-${item.size}`}
                    className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3 text-sm last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-black">
                        {isCurveItem
                          ? `${item.name} (CURVA)`
                          : getCartItemLabel(item)}
                      </p>

                      {isCurveItem && item.selectedColor && (
                        <p className="mt-1 text-xs font-semibold uppercase text-zinc-500">
                          {item.selectedColor}
                        </p>
                      )}

                      {isCurveItem && curveSizes.length > 0 && (
                        <div className="mt-2 grid w-fit gap-1 text-xs font-semibold text-zinc-700">
                          {curveSizes.map((size) => (
                            <span
                              key={size}
                              className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-2.5 py-1"
                            >
                              Talle {size} x {item.quantity}
                            </span>
                          ))}
                        </div>
                      )}
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

            <div className="space-y-3">
              <div className="rounded-2xl bg-white">
              <div className="divide-y divide-zinc-200 text-sm">
                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="font-semibold text-zinc-950">
                    Subtotal
                  </span>
                  <span className="font-semibold text-zinc-950">
                    {formatPrice(total)}
                  </span>
                </div>

                <div className="grid gap-3 py-4 sm:grid-cols-[96px_minmax(0,1fr)]">
                  <span className="font-semibold text-zinc-950">
                    Envío
                  </span>

                  <div className="grid gap-2 text-right text-zinc-950">
                    <label className="flex cursor-pointer items-center justify-end gap-2">
                      <span>Retiro por Local</span>
                      <input
                        type="radio"
                        name="checkout-fulfillment"
                        checked={fulfillmentOption === "pickup"}
                        onChange={() => {
                          setFulfillmentOption("pickup");
                          localStorage.setItem(
                            fulfillmentStorageKey,
                            "pickup"
                          );
                        }}
                        className="h-4 w-4 accent-black"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-end gap-2">
                      <span>Aclarar empresa o transporte en notas</span>
                      <input
                        type="radio"
                        name="checkout-fulfillment"
                        checked={fulfillmentOption === "shipping"}
                        onChange={() => {
                          setFulfillmentOption("shipping");
                          localStorage.setItem(
                            fulfillmentStorageKey,
                            "shipping"
                          );
                        }}
                        className="h-4 w-4 accent-black"
                      />
                    </label>
                  </div>
                </div>

              </div>
              </div>

              <div className="rounded-2xl bg-white p-4 text-sm">
                <p className="mb-3 font-semibold text-zinc-950">
                  Método de pago
                </p>

                <div className="grid gap-2 text-zinc-950">
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span>Efectivo</span>
                    <input
                      type="radio"
                      name="checkout-payment"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      className="h-4 w-4 accent-black"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span>Transferencia +5%</span>
                    <input
                      type="radio"
                      name="checkout-payment"
                      checked={paymentMethod === "transfer"}
                      onChange={() => setPaymentMethod("transfer")}
                      className="h-4 w-4 accent-black"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl bg-white">
              <div className="divide-y divide-zinc-200 text-sm">

                {paymentMethod === "transfer" && (
                  <div className="flex items-center justify-between gap-4 py-4">
                    <span className="font-semibold text-zinc-950">
                      Transferencia 5%
                    </span>
                    <span className="font-semibold text-zinc-950">
                      {formatPrice(paymentSurcharge)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="font-semibold text-zinc-950">
                    Embalaje y Cadetería
                  </span>
                  <span className="font-semibold text-zinc-950">
                    {selectedFulfillment
                      ? formatPrice(fulfillmentFee)
                      : "Elegir"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="font-semibold text-zinc-950">
                    Total
                  </span>
                  <span className="text-xl font-semibold text-zinc-950">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>
              </div>
            </div>

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

            {showError && hasNoPayment && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
                Elegi una forma de pago para continuar.
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
                hasNoPayment ||
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
          </aside>
        </div>
      </div>
    </main>
  );
}
