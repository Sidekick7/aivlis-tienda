"use client";

import { Grid3X3, Home, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";

const navItems = [
  {
    label: "Inicio",
    href: "/",
    icon: Home,
  },
  {
    label: "Catalogo",
    href: "/tienda",
    icon: Grid3X3,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-black/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 text-white shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-3 items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition ${
                isActive
                  ? "bg-white text-black"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={21} />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="relative flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold uppercase tracking-wide text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          aria-label="Abrir carrito"
        >
          <span className="relative">
            <ShoppingBag size={22} />

            {cartItemCount > 0 && (
              <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                {cartItemCount}
              </span>
            )}
          </span>
          Carrito
        </button>
      </div>
    </nav>
  );
}
