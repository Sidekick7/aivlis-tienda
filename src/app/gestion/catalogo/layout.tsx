import type { Metadata } from "next";

export const metadata: Metadata = { title: "Catalogo interno" };

export default function InternalCatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
