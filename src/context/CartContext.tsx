"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getVariantSizeStock } from "@/lib/stock";
import type { Product } from "@/types/product";

const cartStorageKey = "cart_v2";
const legacyCartStorageKey = "cart";

export type CartItem = {
  id: number;
  slug: string;
  name: string;
  price: number;
  retailPrice: number;
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

function normalizeSavedCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const itemsByKey = new Map<string, CartItem>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const cartItem = item as Partial<CartItem>;
    const id = Number(cartItem.id);
    const quantity = Number(cartItem.quantity);
    const price = Number(cartItem.price);

    if (
      !Number.isFinite(id) ||
      !cartItem.slug ||
      !cartItem.name ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price)
    ) {
      continue;
    }

    const normalizedItem: CartItem = {
      id,
      slug: cartItem.slug,
      name: cartItem.name,
      price,
      retailPrice: Number(cartItem.retailPrice || price),
      quantity,
      size: cartItem.size,
      images: cartItem.images,
      variants: cartItem.variants,
      selectedImage: cartItem.selectedImage,
      selectedColor: cartItem.selectedColor,
    };
    const key = [
      normalizedItem.id,
      normalizedItem.size || "",
      normalizedItem.selectedColor || "",
    ].join("|");
    const existingItem = itemsByKey.get(key);

    if (existingItem) {
      itemsByKey.set(key, {
        ...existingItem,
        quantity: existingItem.quantity + normalizedItem.quantity,
      });
    } else {
      itemsByKey.set(key, normalizedItem);
    }
  }

  return Array.from(itemsByKey.values());
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
      localStorage.removeItem(legacyCartStorageKey);

      const savedCart = localStorage.getItem(cartStorageKey);

      if (savedCart) {
        try {
          setCart(normalizeSavedCart(JSON.parse(savedCart)));
        } catch {
          setCart([]);
          localStorage.removeItem(cartStorageKey);
        }
      }

      setIsCartReady(true);
    });

  }, []);

  useEffect(() => {
    if (!isCartReady) return;

    localStorage.setItem(
      cartStorageKey,
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
