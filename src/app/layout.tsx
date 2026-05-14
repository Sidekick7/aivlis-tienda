import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";
import Cart from "@/components/Cart";
import CartWrapper from "@/components/CartWrapper";
import { SearchProvider } from "@/context/SearchContext";
import SearchModal from "@/components/SearchModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >

      <body className="bg-black text-white min-h-full">

      <SearchProvider>  

        <CartProvider>

          <Navbar />

          <CartWrapper />
          <SearchModal />

          {children}

        </CartProvider>

      </SearchProvider>  

      </body>

    </html>
  );
}