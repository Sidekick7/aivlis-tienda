"use client";

import Cart from "@/components/Cart";
import { useCart } from "@/context/CartContext";

export default function CartWrapper() {

  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    deleteItem,
  } = useCart();

  return (
    <>
      {isCartOpen && (
        <Cart
          cart={cart}
          onClose={() => setIsCartOpen(false)}
          deleteItem={deleteItem}
        />
      )}
    </>
  );
}
