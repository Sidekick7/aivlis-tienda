import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preguntas" };

export default function QuestionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
