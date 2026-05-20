"use client";

import Cart from "@/components/Cart";
import { useCart } from "@/context/CartContext";

export default function CartWrapper() {

  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    deleteItem,
    isCartReady,
  } = useCart();

  return (
    <>
      {isCartOpen && (
        <Cart
          cart={cart}
          isCartReady={isCartReady}
          onClose={() => setIsCartOpen(false)}
          deleteItem={deleteItem}
        />
      )}
    </>
  );
}
