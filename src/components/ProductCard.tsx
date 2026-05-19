"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
};

export default function ProductCard({
  product,
}: Props) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/50">

      <Link href={`/product/${product.slug}`}>

        <Image
          src={product.variants[0].images[0]}
          alt={product.name}
          width={380}
          height={520}
          className="max-w-[380px] w-full h-[520px] object-cover transition duration-500 hover:scale-105"
        />

      </Link>

        <div className="p-5">
        <Link href={`/product/${product.slug}`}>  
          <h2 className="inline-block text-2xl font-semibold">
            {product.name}
          </h2>
        </Link>  

          <p className="mt-2 text-zinc-600">
            ${product.price}
          </p>


      <div className="flex items-center gap-2 mt-2">

          {product.variants?.map((variant) => (

            <div
              key={variant.color}
              className="w-4 h-4 rounded-full border border-zinc-400"
              style={{
                backgroundColor: variant.hex,
              }}
            />

          ))}

      </div>  

      <div className="flex gap-2 mt-2">

          {product.variants?.[0]?.sizes?.map((sizeItem) => (

            <div
              key={sizeItem.size}
              className="w-8 h-8 text-xs rounded-full border border-zinc-400 flex items-center justify-center text-xs text-zinc-600"
            >
              {sizeItem.size}
            </div>

          ))}

      </div>


        </div>

        

    </div>
  );
}
