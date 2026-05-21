"use client";

import { usePathname } from "next/navigation";
import CartWrapper from "@/components/CartWrapper";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SearchModal from "@/components/SearchModal";

type SiteChromeProps = {
  children: React.ReactNode;
};

export default function SiteChrome({
  children,
}: SiteChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return children;
  }

  return (
    <>
      <Navbar />
      <CartWrapper />
      <SearchModal />
      {children}
      <Footer />
    </>
  );
}
