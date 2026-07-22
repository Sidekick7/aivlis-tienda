import type { Metadata } from "next";

export const metadata: Metadata = { title: "Catalogo" };

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
