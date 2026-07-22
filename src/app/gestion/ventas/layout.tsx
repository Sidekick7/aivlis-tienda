import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ventas" };

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
