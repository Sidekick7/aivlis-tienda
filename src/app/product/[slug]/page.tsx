
import ProductInfo from "@/components/ProductInfo";
import Image from "next/image";
import Link from "next/link";

import { getProductBySlug, getProductsByCategory } from "@/lib/products";
import { getProductImage } from "@/lib/productDisplay";
import {
  formatPrice,
  getRetailPrice,
  hasDifferentRetailPrice,
} from "@/lib/pricing";
import type { Product } from "@/types/product";

function RelatedProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group overflow-hidden rounded-2xl bg-white transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-72 bg-zinc-200 sm:h-80 lg:h-96">
        <Image
          src={getProductImage(product)}
          alt={product.name}
          width={320}
          height={360}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-semibold">
          {product.name}
        </h3>

        <p className="mt-2 font-semibold text-black">
          Mayorista {formatPrice(product.price)}
        </p>

        {hasDifferentRetailPrice(product) && (
          <p className="text-sm text-zinc-500">
            Minorista {formatPrice(getRetailPrice(product))}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function ProductPage({

  params,
}: {
  params: Promise<{ slug: string }>;
}) {

  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    
    return (
      <div className="home-main-offset flex min-h-screen items-center justify-center bg-zinc-100 px-6 text-black">
        Producto no encontrado
      </div>
    );
  }

  const relatedProducts = (await getProductsByCategory(product.category))
    .filter((relatedProduct) => relatedProduct.id !== product.id)
    .slice(0, 4);

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 px-6 pb-20 text-black">

      <div className="mx-auto mt-4 max-w-7xl md:mt-6">

        <ProductInfo product={product} />

        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-zinc-500">
                  Tambien podria gustarte
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Productos relacionados
                </h2>
              </div>

              <Link
                href="/tienda"
                className="hidden h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:inline-flex"
              >
                Ver mas productos
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <RelatedProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                />
              ))}
            </div>
          </section>
        )}

      </div>

    </main>
  );
}
