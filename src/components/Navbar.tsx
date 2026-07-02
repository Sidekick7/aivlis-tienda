"use client";

import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useSearch } from "@/context/SearchContext";
import { getCategories, getFallbackCategories } from "@/lib/categories";
import { formatPrice, getCartPricing } from "@/lib/pricing";
import type { StoreCategory } from "@/types/category";

const infoNavLinks = [
  { label: "Contacto", href: "/contacto" },
  { label: "Local", href: "/local" },
  { label: "Preguntas", href: "/preguntas" },
  { label: "Catalogo", href: "/tienda" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryBarVisible, setIsCategoryBarVisible] =
    useState(true);
  const [navCategories, setNavCategories] = useState<StoreCategory[]>(
    getFallbackCategories()
  );
  const { setIsSearchOpen } = useSearch();
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  const cartTotal = getCartPricing(cart).total;

  useEffect(() => {
    getCategories().then(setNavCategories);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsCategoryBarVisible(window.scrollY <= 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 w-full border-b border-zinc-800 bg-black text-white">
        <div className="flex h-8 items-center justify-center bg-white px-4 text-center text-sm font-medium uppercase leading-none tracking-wide text-black sm:text-base">
          Compra mínima $100.000
        </div>

        <div className="grid h-[60px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-5 md:grid-cols-[1fr_auto_1fr] md:px-10">
          <div className="flex items-center gap-3 md:gap-5">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="mobile-menu-trigger text-zinc-300 transition hover:text-white"
              aria-label="Abrir menú"
            >
              <Menu size={26} />
            </button>

            <div className="desktop-info-links items-center gap-6">
              {infoNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/"
            className="flex h-full min-w-0 items-center justify-center transition hover:opacity-80"
            aria-label="AIVLIS"
          >
            <Image
              src="/aiv.png"
              alt="AIVLIS"
              width={300}
              height={48}
              priority
              className="h-[56px] w-[210px] object-contain min-[380px]:w-[235px] sm:w-80 md:h-[60px] md:w-[400px]"
            />
          </Link>

          <div className="relative flex items-center justify-end gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="text-zinc-300 transition hover:text-white"
              aria-label="Buscar productos"
            >
              <Search size={24} />
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 rounded-full text-zinc-300 transition hover:text-white"
              aria-label="Abrir carrito"
            >
              {cart.length > 0 && (
                <span className="hidden rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-white min-[420px]:inline">
                  {formatPrice(cartTotal)}
                </span>
              )}

              <span className="relative">
                <ShoppingBag size={24} />

                {cart.length > 0 && (
                  <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-black">
                    {cartItemCount}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        <div
          className={`desktop-category-bar overflow-hidden px-5 transition-all duration-300 ease-out md:px-10 ${
            isCategoryBarVisible
              ? "max-h-12 border-t border-zinc-800 opacity-100"
              : "max-h-0 border-t border-transparent opacity-0"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 py-2 lg:gap-12">
            {navCategories.map((category) => (
              <Link
                key={category.value}
                href={`/tienda?categoria=${category.value}`}
                className="text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:text-white"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div
        onClick={() => setIsMenuOpen(false)}
        className={`mobile-menu-overlay fixed inset-0 z-50 bg-black/50 transition-opacity duration-500 ${
          isMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className={`h-full w-[300px] border-r border-zinc-800 bg-black p-6 text-white transition-transform duration-300 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Menú
            </h2>

            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <X />
            </button>
          </div>

          <div className="mb-8 flex flex-col gap-6 text-lg">
            {infoNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="w-fit transition hover:text-zinc-400"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-8">
            <div className="flex flex-col gap-6 text-lg">
              {navCategories.map((category) => (
                <Link
                  key={category.value}
                  href={`/tienda?categoria=${category.value}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-fit transition hover:text-zinc-400"
                >
                  {category.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
