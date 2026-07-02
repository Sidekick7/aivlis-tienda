"use client";

import Cart from "@/components/Cart";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";

export default function CartWrapper() {

  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    deleteItem,
    isCartReady,
  } = useCart();
  const [shouldRenderCart, setShouldRenderCart] =
    useState(isCartOpen);
  const [isCartVisible, setIsCartVisible] =
    useState(false);

  useEffect(() => {
    if (isCartOpen) {
      const mountTimeout = window.setTimeout(() => {
        setShouldRenderCart(true);
      }, 0);

      const visibleTimeout = window.setTimeout(() => {
        setIsCartVisible(true);
      }, 20);

      return () => {
        window.clearTimeout(mountTimeout);
        window.clearTimeout(visibleTimeout);
      };
    }

    const hideTimeout = window.setTimeout(() => {
      setIsCartVisible(false);
    }, 0);

    const unmountTimeout = window.setTimeout(() => {
      setShouldRenderCart(false);
    }, 260);

    return () => {
      window.clearTimeout(hideTimeout);
      window.clearTimeout(unmountTimeout);
    };
  }, [isCartOpen]);

  return (
    <>
      {shouldRenderCart && (
        <Cart
          cart={cart}
          isOpen={isCartVisible}
          isCartReady={isCartReady}
          onClose={() => setIsCartOpen(false)}
          deleteItem={deleteItem}
        />
      )}
    </>
  );
}
