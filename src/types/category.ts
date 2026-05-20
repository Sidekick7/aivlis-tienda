export type StoreCategory = {
  id?: number;
  label: string;
  value: string;
  sortOrder: number;
  active: boolean;
};

export type SupabaseCategoryRow = {
  id: number;
  label?: string | null;
  value?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
};
