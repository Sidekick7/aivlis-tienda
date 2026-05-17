
import ProductInfo from "@/components/ProductInfo";

import { supabase } from "@/lib/supabase";
export default async function ProductPage({

  params,
}: {
  params: Promise<{ slug: string }>;
}) {

  const { slug } = await params;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!product) {
    
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Producto no encontrado
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 pt-32 pb-20">

      <div className="max-w-7xl mx-auto">



      <ProductInfo product={product} />

      </div>

    </main>
  );
}