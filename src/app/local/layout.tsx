import type { Metadata } from "next";

export const metadata: Metadata = { title: "Local" };

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
