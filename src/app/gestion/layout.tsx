import type { Metadata } from "next";
import GestionThemeToggle from "./GestionThemeToggle";

export const metadata: Metadata = { title: "Gestion" };

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="gestion-theme min-h-screen text-zinc-200"
      data-gestion-tone="soft"
    >
      {children}
      <GestionThemeToggle />
    </div>
  );
}
