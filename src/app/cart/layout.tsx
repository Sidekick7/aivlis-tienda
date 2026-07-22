import type { Metadata } from "next";

export const metadata: Metadata = { title: "Carrito" };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
