import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
import SiteChrome from "@/components/SiteChrome";
import NumberInputWheelGuard from "@/components/NumberInputWheelGuard";

export const metadata: Metadata = {
  title: {
    default: "AIVLIS",
    template: "%s | AIVLIS",
  },
  description: "AIVLIS STORE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="es"
      className="h-full antialiased"
    >

      <body className="bg-black text-white min-h-full">

      <NumberInputWheelGuard />

      <SearchProvider>  

        <CartProvider>

          <SiteChrome>
            {children}
          </SiteChrome>

        </CartProvider>

      </SearchProvider>  

      </body>

    </html>
  );
}
