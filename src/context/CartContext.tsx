"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  images?: string[];
  
  selectedImage?: string;
  selectedColor?: string;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (
    product: any,
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

  isCartOpen: boolean;
  setIsCartOpen: (value: boolean) => void;
};

const CartContext = createContext<CartContextType | null>(
  null
);

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] =
    useState(false);

  useEffect(() => {

    const savedCart =
      localStorage.getItem("cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

  }, []);

  useEffect(() => {

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

  }, [cart]);

  const addToCart = (
    product: any,
    size?: string,
    quantity: number = 1
  ) => {

    const existingProduct = cart.find(
      (item) =>
        item.id === product.id &&
        item.size === size &&
        item.selectedColor === product.selectedColor
    );

    let updatedCart;

    if (existingProduct) {

      updatedCart = cart.map((item) =>
        item.id === product.id &&
        item.size === size &&
        item.selectedColor === product.selectedColor
          ? {
              ...item,
              quantity:
                item.quantity + quantity,
            }
          : item
      );

    } else {

      updatedCart = [
        ...cart,
        {
          ...product,
          size,
          quantity,
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
            item.quantity <20
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
    cart.filter((item) => item.id !== id);

  setCart(updatedCart);

};

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        deleteItem,
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

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}