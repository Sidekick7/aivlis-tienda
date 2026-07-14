"use client";

import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { getCategories, getFallbackCategories } from "@/lib/categories";
import { getProductImage } from "@/lib/productDisplay";
import {
  getPublicProductName,
  getPublicProductSortPrice,
  getPublicProducts,
  withCurveCategory,
} from "@/lib/publicProducts";
import { formatPrice, getCartPricing } from "@/lib/pricing";
import type { StoreCategory } from "@/types/category";
import type { Product } from "@/types/product";

const infoNavLinks = [
  { label: "Contacto", href: "/contacto" },
  { label: "Local", href: "/local" },
  { label: "Preguntas", href: "/preguntas" },
  { label: "Catalogo", href: "/tienda" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] =
    useState(false);
  const [isCategoryBarVisible, setIsCategoryBarVisible] =
    useState(true);
  const [navCategories, setNavCategories] = useState<StoreCategory[]>(
    getFallbackCategories()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  const cartTotal = getCartPricing(cart).total;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearchQuery
    ? searchProducts
        .filter((product) =>
          getPublicProductName(product)
            .toLowerCase()
            .includes(normalizedSearchQuery)
        )
        .slice(0, 6)
    : [];

  useEffect(() => {
    const loadNavContent = async () => {
      try {
        const [categories, products] = await Promise.all([
          getCategories(),
          getPublicProducts(),
        ]);

        setNavCategories(withCurveCategory(categories, products));
        setSearchProducts(products);
      } catch {
        setSearchProducts([]);
      }
    };

    loadNavContent();
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

  useEffect(() => {
    if (!isMobileSearchOpen) return;

    const focusTimeout = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(focusTimeout);
  }, [isMobileSearchOpen]);

  useEffect(() => {
    if (!isMobileSearchOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest("[data-mobile-search='true']")
      ) {
        return;
      }

      setIsMobileSearchOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isMobileSearchOpen]);

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 w-full border-b border-zinc-800 bg-black text-white">
        <div className="flex h-10 items-center justify-center bg-white px-4 text-center text-base font-normal uppercase leading-none text-black sm:text-lg">
          Venta mayorista - Compra mínima $100.000
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
                  className="font-brand text-base uppercase text-zinc-300 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative mx-auto flex h-[56px] w-[210px] items-center justify-center min-[380px]:w-[235px] sm:w-80 md:h-[60px] md:w-[400px]">
            <Image
              src="/aiv.png"
              alt="AIVLIS"
              width={300}
              height={48}
              priority
              className="pointer-events-none h-full w-full object-contain"
            />

            <Link
              href="/"
              className="absolute left-1/2 top-1/2 h-[72%] w-[78%] -translate-x-1/2 -translate-y-1/2 transition hover:opacity-80 sm:w-[72%] md:w-[68%]"
              aria-label="AIVLIS"
            >
              <span className="sr-only">AIVLIS</span>
            </Link>
          </div>

          <div className="relative flex items-center justify-end gap-3 sm:gap-5">
            <div className="relative hidden sm:block">
              <label className="flex h-8 w-[155px] items-center border border-white bg-black px-2 text-white transition focus-within:bg-zinc-950">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="BUSCAR"
                  className="min-w-0 flex-1 bg-transparent text-sm uppercase outline-none placeholder:text-zinc-400"
                />

                <Search
                  size={18}
                  className="shrink-0 text-white"
                />
              </label>

              {normalizedSearchQuery && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[280px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                  {searchResults.length > 0 ? (
                    searchResults.map((product) => (
                      <Link
                        key={product.slug}
                        href={`/product/${product.slug}`}
                        onClick={() => {
                          setSearchQuery("");
                          setIsMobileSearchOpen(false);
                        }}
                        className="flex items-center gap-3 border-b border-zinc-800 p-3 text-white transition last:border-b-0 hover:bg-zinc-900"
                      >
                        <Image
                          src={getProductImage(product)}
                          alt={getPublicProductName(product)}
                          width={42}
                          height={42}
                          className="h-11 w-11 rounded-lg object-cover"
                        />

                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold">
                            {getPublicProductName(product)}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {formatPrice(
                              getPublicProductSortPrice(product)
                            )}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-zinc-400">
                      Sin resultados.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setIsMobileSearchOpen((current) => !current)
              }
              data-mobile-search="true"
              className="text-zinc-300 transition hover:text-white sm:hidden"
              aria-label="Buscar productos"
            >
              <Search size={23} />
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
          data-mobile-search="true"
          className={`overflow-hidden border-t border-zinc-800 bg-black px-3 transition-all duration-300 sm:hidden ${
            isMobileSearchOpen
              ? "max-h-[360px] py-3 opacity-100"
              : "max-h-0 py-0 opacity-0"
          }`}
        >
          <label className="flex h-9 items-center border border-white bg-black px-2 text-white">
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="BUSCAR"
              className="min-w-0 flex-1 bg-transparent text-sm uppercase outline-none placeholder:text-zinc-400"
            />

            <Search
              size={18}
              className="shrink-0 text-white"
            />
          </label>

          {normalizedSearchQuery && (
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              {searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/product/${product.slug}`}
                    onClick={() => {
                      setSearchQuery("");
                      setIsMobileSearchOpen(false);
                    }}
                    className="flex items-center gap-3 border-b border-zinc-800 p-3 text-white transition last:border-b-0 hover:bg-zinc-900"
                  >
                    <Image
                      src={getProductImage(product)}
                      alt={getPublicProductName(product)}
                      width={42}
                      height={42}
                      className="h-11 w-11 rounded-lg object-cover"
                    />

                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold">
                        {getPublicProductName(product)}
                      </p>

                      <p className="text-xs text-zinc-400">
                        {formatPrice(
                          getPublicProductSortPrice(product)
                        )}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="p-3 text-sm text-zinc-400">
                  Sin resultados.
                </p>
              )}
            </div>
          )}
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
                className="font-brand text-base uppercase text-zinc-300 transition hover:text-white"
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
            <h2 className="font-brand text-2xl">
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
                className="font-brand w-fit transition hover:text-zinc-400"
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
                  className="font-brand w-fit transition hover:text-zinc-400"
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
