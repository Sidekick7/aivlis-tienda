
import ProductInfo from "@/components/ProductInfo";
import { products } from "@/data/products";

export default async function ProductPage({

  params,
}: {
  params: Promise<{ slug: string }>;
}) {

  const { slug } = await params;

  const product = products.find(
    (p) => p.slug === slug
  );

  if (!product) {
    
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Producto no encontrado
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <div className="grid md:grid-cols-2 gap-10">



      <ProductInfo product={product} />

      </div>

    </main>
  );
}