"use client";

import { Menu, Search, X, ShoppingBag, } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useSearch } from "@/context/SearchContext";
import Cart from "@/components/Cart";


type Props = {
  onCartClick?: () => void;
};

export default function Navbar({ onCartClick }: Props) {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMiniCartOpen, setIsMiniCartOpen] =
  useState(false);
  const { setIsSearchOpen } = useSearch();
  const {
  cart,
  removeFromCart,
  
} = useCart();

  return (
    <>

      <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md flex items-center justify-between px-5 md:px-10 py-6 border-b border-zinc-800">

        <div className="flex items-center gap-4">

          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-zinc-300 hover:text-white transition"
          >
            <Menu size={24} />
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="text-zinc-300 hover:text-white transition"
          >
            <Search size={22} />
          </button>

        </div>

        <Link
          href="/"
          className="text-2xl font-bold tracking-[0.3em] hover:opacity-80 transition"
        >
          AIVLIS
        </Link>

        <div
          className="relative flex items-center"
          onMouseEnter={() => setIsMiniCartOpen(true)}
          onMouseLeave={() => setIsMiniCartOpen(false)}
        >

          <Link
            href="/cart"
            className="text-zinc-300 hover:text-white transition relative"
          >
            <ShoppingBag size={22} />

            {cart.length > 0 && (
              <span className="absolute -top-2 -right-4 bg-white text-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Link>

          {isMiniCartOpen && cart.length > 0 && (

            <div className="absolute top-full right-0 pt-2">

              <Cart
                cart={cart}
                removeFromCart={removeFromCart}
                onClose={() => setIsMiniCartOpen(false)}
              />

            </div>

          )}

        </div>

      </nav>

      <div
        onClick={() => setIsMenuOpen(false)}
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-500 ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-[300px] h-full bg-black/70 backdrop-blur-[0px] border-r border-zinc-800 p-6 transform transition-transform duration-400 ease-in-out ${
              isMenuOpen
                ? "translate-x-0"
                : "-translate-x-full"
            }`}
          >

            <div className="flex items-center justify-between mb-10">

              <h2 className="text-xl font-bold">
                Menú
              </h2>

              <button
                onClick={() => setIsMenuOpen(false)}
              >
                <X />
              </button>

            </div>

            <div className="flex flex-col gap-6 text-lg">

              <Link
                href="/category/remeras"
                onClick={() => setIsMenuOpen(false)}
                className="w-fit hover:text-zinc-400 transition"
              >
                Remeras
              </Link>

              <Link
                href="/category/camperas"
                onClick={() => setIsMenuOpen(false)}
                className="w-fit hover:text-zinc-400 transition"
              >
                Camperas
              </Link>

              <Link
                href="/category/pantalones"
                onClick={() => setIsMenuOpen(false)}
                className="w-fit hover:text-zinc-400 transition"
              >
                Pantalones
              </Link>

            </div>

          </div>

        </div>

      

    </>
  );
}