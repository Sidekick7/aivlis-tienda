import { editorialImages } from "@/config/store";
import { supabase } from "@/lib/supabase";
import type {
  HomeContent,
  SiteSocialLinks,
  SupabaseHomeContentRow,
} from "@/types/homeContent";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeCatalogText(value: string) {
  return value
    .replaceAll("TIENDA", "CATALOGO")
    .replaceAll("Tienda", "Catalogo")
    .replaceAll("tienda", "catalogo")
    .replaceAll("Ir a catalogo", "Ir al catalogo")
    .replaceAll("Ir a Catalogo", "Ir al Catalogo")
    .replaceAll("IR A CATALOGO", "IR AL CATALOGO");
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeSocialLinks(value: unknown): SiteSocialLinks {
  const record = toRecord(value);

  return {
    whatsappNumber: toStringValue(
      record.whatsappNumber,
      fallbackHomeContent.socialLinks.whatsappNumber
    ),
    instagramUrl: toStringValue(
      record.instagramUrl,
      fallbackHomeContent.socialLinks.instagramUrl
    ),
    instagramLabel: toStringValue(
      record.instagramLabel,
      fallbackHomeContent.socialLinks.instagramLabel
    ),
    facebookUrl: toStringValue(
      record.facebookUrl,
      fallbackHomeContent.socialLinks.facebookUrl
    ),
    facebookLabel: toStringValue(
      record.facebookLabel,
      fallbackHomeContent.socialLinks.facebookLabel
    ),
    tiktokUrl: toStringValue(
      record.tiktokUrl,
      fallbackHomeContent.socialLinks.tiktokUrl
    ),
    tiktokLabel: toStringValue(
      record.tiktokLabel,
      fallbackHomeContent.socialLinks.tiktokLabel
    ),
    showroomAddress: toStringValue(
      record.showroomAddress,
      fallbackHomeContent.socialLinks.showroomAddress
    ),
  };
}

export const fallbackHomeContent: HomeContent = {
  heroImages: editorialImages,
  trustItems: [
    "Envios a todo el pais",
    "Retiro en local",
    "Stock por talle y color",
    "Pedido por WhatsApp",
  ],
  storeTitle: "CATALOGO",
  storeDescription: "",
  storeButtonLabel: "Ir al catalogo",
  featuredEyebrow: "Seleccion",
  featuredTitle: "Destacados",
  categoryEyebrow: "Accesos rapidos",
  categoryTitle: "Comprar por categoria",
  categoryCardText: "Ver productos disponibles",
  socialLinks: {
    whatsappNumber: "5491164513813",
    instagramUrl: "https://www.instagram.com/aivlis.ind",
    instagramLabel: "@aivlis.ind",
    facebookUrl: "",
    facebookLabel: "Facebook",
    tiktokUrl: "https://www.tiktok.com/@aivlis.ind",
    tiktokLabel: "@aivlis.ind",
    showroomAddress: "Yerbal 3160 - Flores - CABA",
  },
};

function normalizeHomeContent(
  row: SupabaseHomeContentRow
): HomeContent {
  return {
    heroImages: toStringArray(row.hero_images),
    trustItems: toStringArray(row.trust_items),
    storeTitle: normalizeCatalogText(
      row.store_title ?? fallbackHomeContent.storeTitle
    ),
    storeDescription:
      normalizeCatalogText(
        row.store_description ??
          fallbackHomeContent.storeDescription
      ),
    storeButtonLabel: normalizeCatalogText(
      row.store_button_label ??
        fallbackHomeContent.storeButtonLabel
    ),
    featuredEyebrow:
      row.featured_eyebrow ??
      fallbackHomeContent.featuredEyebrow,
    featuredTitle:
      row.featured_title ?? fallbackHomeContent.featuredTitle,
    categoryEyebrow:
      row.category_eyebrow ??
      fallbackHomeContent.categoryEyebrow,
    categoryTitle:
      row.category_title ?? fallbackHomeContent.categoryTitle,
    categoryCardText:
      row.category_card_text ??
      fallbackHomeContent.categoryCardText,
    socialLinks: normalizeSocialLinks(row.social_links),
  };
}

function withContentFallback(content: HomeContent): HomeContent {
  return {
    ...content,
    heroImages:
      content.heroImages.length > 0
        ? content.heroImages
        : fallbackHomeContent.heroImages,
    trustItems:
      content.trustItems.length > 0
        ? content.trustItems
        : fallbackHomeContent.trustItems,
  };
}

export async function getHomeContent({
  fallbackToStatic = true,
}: {
  fallbackToStatic?: boolean;
} = {}): Promise<HomeContent> {
  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    if (fallbackToStatic) return fallbackHomeContent;

    throw error ?? new Error("No se encontro contenido de Home.");
  }

  return withContentFallback(
    normalizeHomeContent(data as SupabaseHomeContentRow)
  );
}

export async function updateHomeContent(content: HomeContent) {
  const { error } = await supabase.from("home_content").upsert({
    id: 1,
    hero_images: content.heroImages,
    trust_items: content.trustItems,
    store_title: content.storeTitle,
    store_description: content.storeDescription,
    store_button_label: content.storeButtonLabel,
    featured_eyebrow: content.featuredEyebrow,
    featured_title: content.featuredTitle,
    category_eyebrow: content.categoryEyebrow,
    category_title: content.categoryTitle,
    category_card_text: content.categoryCardText,
    social_links: content.socialLinks,
  });

  if (error) {
    const isMissingSocialLinksColumn =
      error.code === "PGRST204" ||
      error.message.toLowerCase().includes("social_links");

    if (isMissingSocialLinksColumn) {
      throw new Error(
        "Falta ejecutar supabase/home-content-social-links.sql en Supabase para guardar redes."
      );
    }

    throw error;
  }
}

export async function uploadHomeImage(file: File) {
  const fileName = `${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from("home")
    .upload(fileName, file);

  if (error) {
    throw new Error(`No se pudo subir una imagen: ${error.message}`);
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home/${fileName}`;
}
