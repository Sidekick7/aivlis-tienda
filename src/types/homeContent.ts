export type HomeContent = {
  heroImages: string[];
  trustItems: string[];
  storeTitle: string;
  storeDescription: string;
  storeButtonLabel: string;
  featuredEyebrow: string;
  featuredTitle: string;
  categoryEyebrow: string;
  categoryTitle: string;
  categoryCardText: string;
};

export type SupabaseHomeContentRow = {
  id: number;
  hero_images?: unknown;
  trust_items?: unknown;
  store_title?: string | null;
  store_description?: string | null;
  store_button_label?: string | null;
  featured_eyebrow?: string | null;
  featured_title?: string | null;
  category_eyebrow?: string | null;
  category_title?: string | null;
  category_card_text?: string | null;
};
