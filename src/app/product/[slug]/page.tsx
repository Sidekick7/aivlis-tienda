
import ProductInfo from "@/components/ProductInfo";
import RelatedProductsSlider from "@/components/RelatedProductsSlider";
import type { Metadata } from "next";
import { cache } from "react";

import {
  curveCategoryLabel,
  getPublicProductBySlug,
  getPublicProductName,
  getPublicProducts,
} from "@/lib/publicProducts";

const getProduct = cache(getPublicProductBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  return {
    title: product ? getPublicProductName(product) : "Producto no encontrado",
  };
}

export default async function ProductPage({

  params,
}: {
  params: Promise<{ slug: string }>;
}) {

  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    
    return (
      <div className="home-main-offset flex min-h-screen items-center justify-center bg-zinc-100 px-6 text-black">
        Producto no encontrado
      </div>
    );
  }

  const publicProducts = await getPublicProducts();
  const categoryProducts = publicProducts.filter(
    (relatedProduct) =>
      relatedProduct.slug !== product.slug &&
      relatedProduct.category === product.category
  );
  const featuredProducts =
    categoryProducts.length >= 6
      ? []
      : publicProducts.filter(
          (relatedProduct) =>
            relatedProduct.slug !== product.slug &&
            relatedProduct.featured &&
            !categoryProducts.some(
              (categoryProduct) =>
                categoryProduct.slug === relatedProduct.slug
            )
        );
  const relatedProducts = [
    ...categoryProducts,
    ...featuredProducts,
  ].slice(0, 6);

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 px-6 pb-20 text-black">

      <div className="mx-auto mt-8 max-w-7xl md:mt-10">

        <ProductInfo
          product={product}
          displayName={getPublicProductName(product)}
          displayCategoryLabel={
            product.publicationMode === "curve"
              ? curveCategoryLabel
              : undefined
          }
          initialPurchaseMode={product.publicationMode}
          lockPurchaseMode
        />

        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="font-brand mb-5 text-3xl uppercase text-black md:text-4xl">
              Productos relacionados
            </h2>

            <RelatedProductsSlider products={relatedProducts} />
          </section>
        )}

      </div>

    </main>
  );
}
