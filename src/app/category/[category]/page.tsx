import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {

  const { category } = await params;

  const filteredProducts = products.filter(
    (product) => product.category === category
  );

  return (
    <main className="min-h-screen bg-black text-white p-10 ">

      <h1 className="text-5xl font-bold mb-10 capitalize">
        {category}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

        {filteredProducts.map((product) => (

            <ProductCard
            key={product.id}
            product={product}
            />

        ))}

      </div>

    </main>
  );
}