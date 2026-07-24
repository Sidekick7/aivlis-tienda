export type SaleItemMode = "unit" | "curve";

export type GroupableSaleItem = {
  id?: string;
  productId?: number | null;
  productSlug: string;
  productSku?: string | null;
  productName: string;
  variantColor?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  lineGroupId?: string | null;
  saleMode?: SaleItemMode;
  bundleQuantity?: number;
  unitsPerBundle?: number;
  bundlePrice?: number;
};

export type SaleItemGroup<T extends GroupableSaleItem> = {
  key: string;
  productName: string;
  productSku?: string | null;
  saleMode: SaleItemMode;
  bundleQuantity: number;
  unitsPerBundle: number;
  bundlePrice: number;
  subtotal: number;
  items: T[];
};

export function getSaleItemDisplayName(name: string) {
  const curveMatch = name.match(/^(.*)\s+\(Curva\s+[^)]*\)$/i);

  if (!curveMatch) return name;

  const baseName = curveMatch[1].trim();

  return baseName.startsWith("Curva - ")
    ? baseName
    : `Curva - ${baseName}`;
}

function getLegacyGroupKey(item: GroupableSaleItem) {
  return [
    item.productId ?? item.productSlug,
    item.productSku ?? "",
    getSaleItemDisplayName(item.productName),
  ].join("|");
}

function getUnitGroupKey(item: GroupableSaleItem) {
  return [
    "unit",
    item.productId ?? item.productSlug,
    item.productSku ?? "",
    getSaleItemDisplayName(item.productName),
    item.variantColor ?? "",
    item.unitPrice,
  ].join("|");
}

export function groupSaleItems<T extends GroupableSaleItem>(items: T[]) {
  const groupedItems = new Map<string, T[]>();

  for (const item of items) {
    const displayName = getSaleItemDisplayName(item.productName);
    const isCurveItem =
      item.saleMode === "curve" || displayName.startsWith("Curva - ");
    const key = isCurveItem
      ? item.lineGroupId || getLegacyGroupKey(item)
      : getUnitGroupKey(item);
    const currentItems = groupedItems.get(key) ?? [];

    currentItems.push(item);
    groupedItems.set(key, currentItems);
  }

  return Array.from(groupedItems.entries()).map(([key, groupItems]) => {
    const firstItem = groupItems[0];
    const displayName = getSaleItemDisplayName(firstItem.productName);
    const saleMode: SaleItemMode =
      firstItem.saleMode === "curve" || displayName.startsWith("Curva - ")
        ? "curve"
        : "unit";
    const productName =
      saleMode === "curve" && !displayName.startsWith("Curva - ")
        ? `Curva - ${displayName}`
        : displayName;
    const inferredBundleQuantity =
      saleMode === "curve"
        ? Math.max(1, Math.min(...groupItems.map((item) => item.quantity)))
        : groupItems.reduce((total, item) => total + item.quantity, 0);
    const unitsPerBundle =
      saleMode === "curve"
        ? firstItem.unitsPerBundle || groupItems.length
        : 1;
    const bundlePrice =
      saleMode === "curve"
        ? firstItem.bundlePrice ||
          groupItems.reduce((total, item) => total + item.unitPrice, 0)
        : firstItem.bundlePrice || firstItem.unitPrice;

    return {
      key,
      productName,
      productSku: firstItem.productSku,
      saleMode,
      bundleQuantity:
        firstItem.bundleQuantity || inferredBundleQuantity,
      unitsPerBundle,
      bundlePrice,
      subtotal: groupItems.reduce(
        (total, item) => total + item.subtotal,
        0
      ),
      items: groupItems,
    } satisfies SaleItemGroup<T>;
  });
}
