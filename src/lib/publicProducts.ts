import {
  getProductBySlug,
  getProducts,
} from "@/lib/products";
import {
  getCurveUnitsPerSet,
  isCurveProduct,
} from "@/lib/curve";
import {
  getEffectiveWebUnitPrice,
  isProductSaleActive,
} from "@/lib/pricing";
import type { StoreCategory } from "@/types/category";
import type { Product } from "@/types/product";

export const curveCategoryValue = "curvas";
export const curveCategoryLabel = "Curvas";
export const saleCategoryValue = "sale";
export const saleCategoryLabel = "Sale";

export type PublicProductMode = "unit" | "curve";

export type PublicProduct = Product & {
  publicName: string;
  publicationMode: PublicProductMode;
  sourceSlug: string;
  sourceProductId: number;
};

export function getCurvePublicationSlug(product: Product) {
  return `${product.slug}-curva`;
}

function toUnitPublication(product: Product): PublicProduct {
  return {
    ...product,
    publicName: product.name,
    publicationMode: "unit",
    sourceSlug: product.slug,
    sourceProductId: product.id,
  };
}

function toCurvePublication(product: Product): PublicProduct {
  return {
    ...product,
    slug: getCurvePublicationSlug(product),
    category: curveCategoryValue,
    publicName: `Curva - ${product.name}`,
    publicationMode: "curve",
    sourceSlug: product.slug,
    sourceProductId: product.id,
  };
}

export function isPublicCurveProduct(product: Product) {
  return (
    "publicationMode" in product &&
    (product as PublicProduct).publicationMode === "curve"
  );
}

export function getPublicProductName(product: Product) {
  return "publicName" in product
    ? (product as PublicProduct).publicName
    : product.name;
}

export function getPublicProductPriceMode(
  product: Product
): PublicProductMode {
  return isPublicCurveProduct(product) ? "curve" : "unit";
}

export function isPublicProductOnSale(product: Product) {
  return isProductSaleActive(
    product,
    getPublicProductPriceMode(product)
  );
}

export function getPublicProductSortPrice(product: Product) {
  const mode = getPublicProductPriceMode(product);
  const unitPrice = getEffectiveWebUnitPrice(product, mode);

  if (mode === "unit") return unitPrice;

  const curveUnits = getCurveUnitsPerSet(product.variants[0]);

  return unitPrice * Math.max(curveUnits, 1);
}

export function expandPublicProducts(
  products: Product[]
): PublicProduct[] {
  return products.flatMap((product) => {
    const publications = [toUnitPublication(product)];

    if (isCurveProduct(product)) {
      publications.push(toCurvePublication(product));
    }

    return publications;
  });
}

export async function getPublicProducts() {
  const products = await getProducts();

  return expandPublicProducts(products);
}

export async function getPublicProductBySlug(slug: string) {
  const exactProduct = await getProductBySlug(slug);

  if (exactProduct) return toUnitPublication(exactProduct);

  if (!slug.endsWith("-curva")) return null;

  const sourceSlug = slug.replace(/-curva$/, "");
  const sourceProduct = await getProductBySlug(sourceSlug);

  if (!sourceProduct || !isCurveProduct(sourceProduct)) return null;

  return toCurvePublication(sourceProduct);
}

export function withCurveCategory(
  categories: StoreCategory[],
  products: Product[]
) {
  if (!products.some((product) => isCurveProduct(product))) {
    return categories;
  }

  if (
    categories.some(
      (category) => category.value === curveCategoryValue
    )
  ) {
    return categories;
  }

  const maxSortOrder = Math.max(
    0,
    ...categories.map((category) => category.sortOrder)
  );

  return [
    ...categories,
    {
      label: curveCategoryLabel,
      value: curveCategoryValue,
      sortOrder: maxSortOrder + 1,
      active: true,
    },
  ];
}

export function withSaleCategory(
  categories: StoreCategory[],
  products: Product[]
) {
  if (!products.some(isPublicProductOnSale)) {
    return categories;
  }

  if (
    categories.some(
      (category) => category.value === saleCategoryValue
    )
  ) {
    return categories;
  }

  const maxSortOrder = Math.max(
    0,
    ...categories.map((category) => category.sortOrder)
  );

  return [
    ...categories,
    {
      label: saleCategoryLabel,
      value: saleCategoryValue,
      sortOrder: maxSortOrder + 1,
      active: true,
    },
  ];
}
