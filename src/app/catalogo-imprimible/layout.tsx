import type { Metadata } from "next";

export const metadata: Metadata = { title: "Catalogo imprimible" };

export default function PrintableCatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
