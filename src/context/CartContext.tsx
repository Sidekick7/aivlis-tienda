"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getVariantSizeStock } from "@/lib/stock";
import type { Product } from "@/types/product";

export type CartItem = {
  id: number;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  images?: string[];
  variants?: Product["variants"];
  
  selectedImage?: string;
  selectedColor?: string;
};

type CartProduct = Product & {
  selectedImage?: string;
  selectedColor?: string;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (
    product: CartProduct,
    size?: string,
    quantity?: number
  ) => void;
  removeFromCart: (
    id: number,
    size?: string,
    color?: string
  ) => void;
  increaseQuantity: (
    id: number,
    size?: string,
    color?: string
  ) => void;
  deleteItem: (
    id: number,
    size?: string,
    color?: string
  ) => void;
  clearCart: () => void;
  isCartReady: boolean;

  isCartOpen: boolean;
  setIsCartOpen: (value: boolean) => void;
};

const CartContext = createContext<CartContextType | null>(
  null
);

const fallbackCartContext: CartContextType = {
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  increaseQuantity: () => {},
  deleteItem: () => {},
  clearCart: () => {},
  isCartReady: false,
  isCartOpen: false,
  setIsCartOpen: () => {},
};

function getStockForSelection(
  product: {
    variants?: Product["variants"];
    selectedColor?: string;
  },
  size?: string,
  color?: string
) {
  const selectedColor = color ?? product.selectedColor;

  return getVariantSizeStock({
    variants: product.variants,
    color: selectedColor,
    size,
  });
}

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartReady, setIsCartReady] = useState(false);
  const [isCartOpen, setIsCartOpen] =
    useState(false);

  useEffect(() => {

    queueMicrotask(() => {
      const savedCart = localStorage.getItem("cart");

      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart) as CartItem[]);
        } catch {
          setCart([]);
        }
      }

      setIsCartReady(true);
    });

  }, []);

  useEffect(() => {
    if (!isCartReady) return;

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

  }, [cart, isCartReady]);

  const addToCart = (
    product: CartProduct,
    size?: string,
    quantity: number = 1
  ) => {

    const existingProduct = cart.find(
      (item) =>
        item.id === product.id &&
        item.size === size &&
        item.selectedColor === product.selectedColor
    );

    const stockLimit = getStockForSelection(product, size);
    const safeQuantity = Math.min(quantity, stockLimit);

    if (safeQuantity <= 0) return;

    let updatedCart: CartItem[];

    if (existingProduct) {

      updatedCart = cart.map((item) =>
        item.id === product.id &&
        item.size === size &&
        item.selectedColor === product.selectedColor
          ? {
            ...item,
              quantity:
                Math.min(
                  item.quantity + quantity,
                  stockLimit
                ),
            }
          : item
      );

    } else {

      updatedCart = [
        ...cart,
        {
          ...product,
          size,
          quantity: safeQuantity,
        },
      ];

    }

    setCart(updatedCart);
    

  };

const removeFromCart = (
  id: number,
  size?: string,
  color?: string
) => {

  const updatedCart = cart
    .map((item) =>
      item.id === id &&
      item.size === size &&
      item.selectedColor === color
        ? {
            ...item,
            quantity: item.quantity - 1,
          }
        : item
    )
    .filter((item) => item.quantity > 0);

  setCart(updatedCart);

};

const increaseQuantity = (
  id: number,
  size?: string,
  color?: string
) => {

  const updatedCart = cart.map((item) =>
    item.id === id &&
    item.size === size &&
    item.selectedColor === color
      ? {
          ...item,
          quantity:
            item.quantity <
              getStockForSelection(item, size, color)
              ? item.quantity + 1
              : item.quantity,
        }
      : item
  );

  setCart(updatedCart);

};

const deleteItem = (
  id: number,
  size?: string,
  color?: string
) => {

  const updatedCart = cart.filter(
    (item) =>
      !(
        item.id === id &&
        item.size === size &&
        item.selectedColor === color
      )
  );

  setCart(updatedCart);

};

const clearCart = () => {
  setCart([]);
  setIsCartOpen(false);
};

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        deleteItem,
        clearCart,
        isCartReady,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {

  const context = useContext(CartContext);

  return context ?? fallbackCartContext;
}
