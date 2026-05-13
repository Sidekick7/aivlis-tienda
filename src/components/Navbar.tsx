"use client";

import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";


type Props = {
  onCartClick?: () => void;
};

export default function Navbar({ onCartClick }: Props) {

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>

      <nav className="w-full flex items-center justify-between px-10 py-6 border-b border-zinc-800">

        <div className="flex items-center gap-4">

          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-zinc-300 hover:text-white transition"
          >
            <Menu size={24} />
          </button>

          <button className="text-zinc-300 hover:text-white transition">
            <Search size={22} />
          </button>

        </div>

        <Link
          href="/"
          className="text-2xl font-bold tracking-[0.3em] hover:opacity-80 transition"
        >
          AIVLIS
        </Link>

        <div>

          <button
            onClick={onCartClick}
            className="text-zinc-300 hover:text-white transition"
          >
            Carrito
          </button>

        </div>

      </nav>

      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-500 ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
          <div
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
                className="text-left hover:text-zinc-400 transition"
              >
                Remeras
              </Link>

              <Link
                href="/category/camperas"
                onClick={() => setIsMenuOpen(false)}
                className="text-left hover:text-zinc-400 transition"
              >
                Camperas
              </Link>

              <Link
                href="/category/pantalones"
                onClick={() => setIsMenuOpen(false)}
                className="text-left hover:text-zinc-400 transition"
              >
                Pantalones
              </Link>

            </div>

          </div>

        </div>

      

    </>
  );
}