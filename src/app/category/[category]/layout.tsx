import type { Metadata } from "next";
import {
  curveCategoryLabel,
  curveCategoryValue,
} from "@/lib/publicProducts";

function formatCategoryTitle(category: string) {
  if (category === curveCategoryValue) return curveCategoryLabel;

  const decodedCategory = decodeURIComponent(category).replaceAll("-", " ");

  return decodedCategory
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;

  return { title: formatCategoryTitle(category) };
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
