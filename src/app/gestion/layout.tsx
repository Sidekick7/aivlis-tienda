import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestion" };

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return children;
}
