import type { Metadata } from "next";

export const metadata: Metadata = { title: "Estadisticas" };

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
