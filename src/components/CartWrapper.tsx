"use client";

import Cart from "@/components/Cart";
import { useCart } from "@/context/CartContext";

export default function CartWrapper() {

  const {
    cart,
    removeFromCart,
    isCartOpen,
    setIsCartOpen,
    deleteItem,
  } = useCart();

  return (
    <>
      {isCartOpen && (
        <Cart
          cart={cart}
          removeFromCart={removeFromCart}
          onClose={() => setIsCartOpen(false)}
          deleteItem={deleteItem}
        />
      )}
    </>
  );
}