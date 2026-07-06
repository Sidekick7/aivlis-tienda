export type SiteSocialLinks = {
  whatsappNumber: string;
  instagramUrl: string;
  instagramLabel: string;
  facebookUrl: string;
  facebookLabel: string;
  tiktokUrl: string;
  tiktokLabel: string;
  showroomAddress: string;
};

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
  socialLinks: SiteSocialLinks;
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
  social_links?: unknown;
};
