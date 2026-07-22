import type { Metadata } from "next";

export const metadata: Metadata = { title: "Punto de venta" };

export default function PointOfSaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
