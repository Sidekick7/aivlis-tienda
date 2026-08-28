import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
