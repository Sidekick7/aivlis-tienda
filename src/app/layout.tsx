import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
import SiteChrome from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "A I V L I S",
  description: "AIVLIS STORE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >

      <body className="bg-black text-white min-h-full">

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
