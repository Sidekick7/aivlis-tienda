"use client";

import { usePathname } from "next/navigation";
import CartWrapper from "@/components/CartWrapper";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import Navbar from "@/components/Navbar";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

type SiteChromeProps = {
  children: React.ReactNode;
};

export default function SiteChrome({
  children,
}: SiteChromeProps) {
  const pathname = usePathname();
  const isInternalPanel =
    pathname.startsWith("/admin") || pathname.startsWith("/gestion");

  if (isInternalPanel) {
    return children;
  }

  return (
    <>
      <Navbar />
      <CartWrapper />
      <WhatsAppFloatingButton />
      <ScrollToTopButton />
      <div className="pb-24 sm:pb-0">
        {children}
        <Footer />
      </div>
      <MobileBottomNav />
    </>
  );
}
