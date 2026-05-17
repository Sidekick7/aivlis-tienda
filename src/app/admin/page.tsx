"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export default function AdminPage() {

const [showCreate, setShowCreate] = useState(false);
const [name, setName] = useState("");
const [slug, setSlug] = useState("");
const [price, setPrice] = useState("");
const [products, setProducts] = useState<any[]>([]);
const [editingProduct, setEditingProduct] = useState<any | null>(null);
const [category, setCategory] = useState("remeras");
const [description, setDescription] = useState("");

const [editingVariantIndex, setEditingVariantIndex] = useState(0);

const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
const [variants, setVariants] = useState<
  {
    color: string;
    hex: string;
    stock: string;
    sizes: string;
    images: File[];
  }[]
>([
  {
    color: "Negro",
    hex: "#000000",
    stock: "",
    sizes: "S,M,L",
    images: [],
  },
]);


useEffect(() => {

  const fetchProducts = async () => {

    const { data } = await supabase
      .from("products")
      .select("*");

    setProducts(data || []);

  };

  fetchProducts();

}, []);

const createProduct = async () => {

  const processedVariants: {
    color: string;
    hex: string;
    stock: number;
    sizes: string[];
    images: string[];
    }[] = [];

  for (const variant of variants) {

    let imageUrls: string[] = [];

    for (const file of variant.images) {

      const fileName = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, file);

      if (!uploadError) {

        imageUrls.push(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${fileName}`
        );

      }

    }

    processedVariants.push({
      color: variant.color,
      hex: variant.hex,
      stock: Number(variant.stock),
      sizes: variant.sizes.split(","),
      images: imageUrls,
    });

  }

  const { error } = await supabase
    .from("products")
    .insert([
      {
        name,
        slug,
        price: Number(price),
        category,
        description,

        details: [
          "Algodón premium",
          "Fit oversized",
          "Industria argentina",
        ],

        featured: false,

        variants: processedVariants,

        images: processedVariants[0]?.images || [],
      },
    ]);

  console.log(error);

  if (!error) {

    const { data } = await supabase
      .from("products")
      .select("*");

    setProducts(data || []);

    setShowCreate(false);

    setName("");
    setSlug("");
    setPrice("");
    setDescription("");

    setVariants([
      {
        color: "Negro",
        hex: "#000000",
        stock: "",
        sizes: "S,M,L",
        images: [],
      },
    ]);

    setSelectedVariantIndex(0);

    alert("Producto creado");

  }

};





const deleteProduct = async (id: number) => {

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (!error) {

    setProducts((prev) =>
      prev.filter((product) => product.id !== id)
    );

  }

};

const updateProduct = async () => {

    const processedVariants = [];

    for (const variant of editingProduct.variants) {

        const imageUrls = [];

        for (const image of variant.images || []) {

            if (typeof image === "string") {

                imageUrls.push(image);

                continue;

            }

            const fileName =
                `${Date.now()}-${image.name}`;

            const { error: uploadError } =
                await supabase.storage
                    .from("products")
                    .upload(fileName, image);

                if (!uploadError) {

                    imageUrls.push(
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${fileName}`
                    );

                }

            }

            processedVariants.push({
                color: variant.color,
                hex: variant.hex,
                stock: Number(variant.stock),
                sizes: variant.sizes,
                images: imageUrls,
            });

        }

  const { error } = await supabase
    .from("products")
    .update({
      name: editingProduct.name,
      slug: editingProduct.slug,
      price: Number(editingProduct.price),

      category: editingProduct.category,
      description: editingProduct.description,

      variants: processedVariants,

      images: processedVariants[0]?.images || [],
      
    })
    .eq("id", editingProduct.id);

  if (!error) {

    const { data } = await supabase
      .from("products")
      .select("*");

    setProducts(data || []);
    setEditingProduct(null);

    alert("Producto actualizado");

  }

};

const selectedVariant = variants[selectedVariantIndex];
const editingVariant =
  editingProduct?.variants?.[editingVariantIndex];

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold mb-10">
        Admin
      </h1>
      
      <div className="grid grid-cols-4 gap-6">

        <div className="bg-zinc-900 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">
            Productos
            </h2>

            <p className="text-zinc-400 mt-2">
            Administrar catálogo
            </p>
            <button
                onClick={() => setShowCreate(true)}
                className="mt-6 bg-white text-black px-5 h-11 rounded-xl font-semibold hover:opacity-90 transition cursor-pointer"
            >
                Nuevo producto
            </button>
            
            
        </div>

      </div>

{showCreate && (

  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
       onClick={() => setShowCreate(false)}
  >

    <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
         onClick={(e) => e.stopPropagation()}
    >

      <div className="flex items-center justify-between mb-8">

        <h2 className="text-3xl font-bold">
          Nuevo producto
        </h2>

        <button
          onClick={() => setShowCreate(false)}
          className="text-zinc-400 hover:text-white transition cursor-pointer"
        >
          ✕
        </button>

      </div>

      <div className="grid gap-5">

        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
          type="text"
          placeholder="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
          type="number"
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="text"
            placeholder="Color"
            value={selectedVariant.color}
            onChange={(e) => {

                const updated = [...variants];

                updated[selectedVariantIndex].color = e.target.value;

                setVariants(updated);

            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="color"
            value={selectedVariant.hex}
            onChange={(e) => {

                const updated = [...variants];

                updated[selectedVariantIndex].hex = e.target.value;

                setVariants(updated);

            }}
            className="w-20 h-12 rounded-xl overflow-hidden bg-transparent cursor-pointer"
        />

        <input
            type="text"
            placeholder="Talles: S,M,L"
            value={selectedVariant.sizes}
            onChange={(e) => {

                const updated = [...variants];

                updated[selectedVariantIndex].sizes = e.target.value;

                setVariants(updated);

            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="number"
            placeholder="Stock"
            value={selectedVariant.stock}
            onChange={(e) => {

                const updated = [...variants];

                updated[selectedVariantIndex].stock = e.target.value;

                setVariants(updated);

            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="file"
            multiple
            onChange={(e) => {

                const updated = [...variants];

                updated[selectedVariantIndex].images = Array.from(
                e.target.files || []
                );

                setVariants(updated);

            }}
            className="text-sm text-zinc-400"
        />

        <div className="flex gap-3 flex-wrap">

            {selectedVariant.images.map((file, index) => (

                <div
                    key={index}
                    className="relative"
                >

                    <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="w-20 h-20 object-cover rounded-xl border border-zinc-700"
                    />

                    <button
                        type="button"
                        onClick={() => {

                        const updated = [...variants];

                        updated[selectedVariantIndex].images =
                            updated[selectedVariantIndex].images.filter(
                            (_, i) => i !== index
                            );

                        setVariants(updated);

                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs"
                    >
                        ✕
                    </button>

                </div>

            ))}

        </div>


        <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        >

            <option value="remeras">
                Remeras
            </option>

            <option value="camperas">
                Camperas
            </option>

            <option value="pantalones">
                Pantalones
            </option>

            <option value="accesorios">
                Accesorios
            </option>

        </select>

        <div className="flex flex-wrap gap-2">

            {variants.map((variant, index) => (

                <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedVariantIndex(index)}
                    className={`px-4 h-10 rounded-xl border transition cursor-pointer ${
                        selectedVariantIndex === index
                            ? "bg-white text-black border-white"
                            : "bg-zinc-800 text-white border-zinc-700"
                    }`}
                >
                    {variant.color || `Color ${index + 1}`}
                </button>

            ))}

            <button
                type="button"
                onClick={() =>
                    setVariants([
                        ...variants,
                        {
                        color: "",
                        hex: "#000000",
                        stock: "",
                        sizes: "S,M,L",
                        images: [],
                        },
                    ])
                }
                className="px-4 h-10 rounded-xl bg-zinc-800 border border-dashed border-zinc-600 hover:border-white transition cursor-pointer"
            >
                + Agregar color
            </button>

        </div>


        <textarea
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[140px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
        />

        <button
          onClick={createProduct}
          className="h-12 bg-white text-black rounded-xl font-semibold hover:opacity-90 transition cursor-pointer"
        >
          Crear producto
        </button>

      </div>

    </div>

  </div>

)}

{editingProduct && (

  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
       onClick={() => setEditingProduct(null)}
  >

    <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
         onClick={(e) => e.stopPropagation()}
    >

      <div className="flex items-center justify-between mb-8">

        <h2 className="text-3xl font-bold">
          Editar producto
        </h2>

        <button
          onClick={() => setEditingProduct(null)}
          className="text-zinc-400 hover:text-white transition cursor-pointer"
        >
          ✕
        </button>

      </div>

      <div className="grid gap-5">

        <input
          type="text"
          value={editingProduct.name}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              name: e.target.value,
            })
          }
          className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
          type="text"
          value={editingProduct.slug}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              slug: e.target.value,
            })
          }
          className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
          type="number"
          value={editingProduct.price}
          onChange={(e) =>
            setEditingProduct({
              ...editingProduct,
              price: e.target.value,
            })
          }
          className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <select
            value={editingProduct.category}
            onChange={(e) =>
                setEditingProduct({
                ...editingProduct,
                category: e.target.value,
                })
            }
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        >

            <option value="remeras">
                Remeras
            </option>

            <option value="camperas">
                Camperas
            </option>

            <option value="pantalones">
                Pantalones
            </option>

            <option value="accesorios">
                Accesorios
            </option>

        </select>

        <textarea
            value={editingProduct.description}
            onChange={(e) =>
                setEditingProduct({
                    ...editingProduct,
                    description: e.target.value,
                })
            }
            className="min-h-[140px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
        />

        <div className="flex flex-wrap gap-2">

            {editingProduct?.variants?.map((variant: any, index: number) => (

                <button
                    key={index}
                    type="button"
                    onClick={() => setEditingVariantIndex(index)}
                    className={`px-4 h-10 rounded-xl border transition cursor-pointer ${
                        editingVariantIndex === index
                            ? "bg-white text-black border-white"
                            : "bg-zinc-800 text-white border-zinc-700"
                    }`}
                >
                    {variant.color || `Color ${index + 1}`}
                </button>

            ))}

        </div>

        <input
            type="text"
            value={editingVariant?.color || ""}
            onChange={(e) => {

                const updated = [...editingProduct.variants];

                updated[editingVariantIndex].color = e.target.value;

                setEditingProduct({
                    ...editingProduct,
                    variants: updated,
                });

            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="color"
            value={editingVariant?.hex || "#000000"}
            onChange={(e) => {

                const updated = [...editingProduct.variants];

                updated[editingVariantIndex].hex = e.target.value;

                setEditingProduct({
                    ...editingProduct,
                    variants: updated,
                });

            }}
            className="w-20 h-12 rounded-xl overflow-hidden bg-transparent cursor-pointer"
        />

        <input
            type="text"
            value={editingVariant?.sizes?.join(",") || ""}
            onChange={(e) => {

                const updated = [...editingProduct.variants];

                updated[editingVariantIndex].sizes =
                    e.target.value.split(",");

                setEditingProduct({
                    ...editingProduct,
                    variants: updated,
                });

            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="number"
            value={editingVariant?.stock ?? ""}
            onChange={(e) => {

                const updated = [...editingProduct.variants];

                updated[editingVariantIndex].stock =
                    Number(e.target.value);

                setEditingProduct({
                    ...editingProduct,
                    variants: updated,
                });

            }}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

  
        <input
            type="file"
            multiple
            className="text-sm text-zinc-400"
        />        

        <div className="flex gap-3 flex-wrap">

            {editingVariant?.images?.map((image: string) => (

                <div
                    key={image}
                    className="relative"
                >

                    <img
                    src={image}
                    alt=""
                    className="w-20 h-20 object-cover rounded-xl border border-zinc-700"
                    />

                    <button
                        onClick={() => {

                            const updated = [...editingProduct.variants];

                            updated[editingVariantIndex].images =
                                updated[editingVariantIndex].images.filter(
                                    (img: string) => img !== image
                                );

                            setEditingProduct({
                                ...editingProduct,
                                variants: updated,
                            });

                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:bg-red-400 transition cursor-pointer"
                    >
                        ✕
                    </button>

                    <div className="absolute bottom-1 left-1 flex gap-1">

                        <button
                            onClick={() => {

                                const index = editingProduct.variants[editingVariantIndex].images.indexOf(image);

                                if (index === 0) return;

                                const updated = [...editingProduct.variants];

                                const images = updated[editingVariantIndex].images;

                                [images[index - 1], images[index]] =
                                [images[index], images[index - 1]];

                                setEditingProduct({
                                    ...editingProduct,
                                    variants: updated,
                                });

                            }}
                            className="w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                        >
                            ←
                        </button>

                        <button
                            onClick={() => {

                                const index =
                                    editingProduct.variants[editingVariantIndex]
                                    .images.indexOf(image);

                                const updated = [...editingProduct.variants];

                                const images = updated[editingVariantIndex].images;

                                if (index === images.length - 1) return;

                                [images[index + 1], images[index]] =
                                [images[index], images[index + 1]];

                                setEditingProduct({
                                    ...editingProduct,
                                    variants: updated,
                                });

                            }}
                            className="w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                        >
                            →
                        </button>

                    </div>




                </div>

                ))}

        </div>

        <button
          onClick={updateProduct}
          className="h-12 bg-white text-black rounded-xl font-semibold hover:opacity-90 transition cursor-pointer"
        >
          Guardar cambios
        </button>

      </div>

    </div>

  </div>

)}

<div className="mt-10 bg-zinc-900 rounded-3xl p-6">

  <h2 className="text-3xl font-bold mb-6">
    Productos
  </h2>

  <div className="flex flex-col gap-4">

    {products.map((product) => (

      <div
        key={product.id}
        className="flex items-center justify-between bg-zinc-800 rounded-2xl p-4"
      >

        <div>
          <h3 className="font-semibold text-xl">
            {product.name}
          </h3>

          <p className="text-zinc-400">
            ${product.price}
          </p>
          <p className="text-zinc-500 text-sm">
                {product.category}
          </p>
        </div>

            <button
                onClick={async () => {

                  await supabase
                    .from("products")
                    .update({
                        featured: !product.featured,
                    })
                    .eq("id", product.id);

                  const { data } = await supabase
                    .from("products")
                    .select("*");

                  setProducts(data || []);

                }}
                className={`px-4 h-10 rounded-xl font-medium transition cursor-pointer ${
                    product.featured
                    ? "bg-white text-black"
                    : "bg-zinc-700 text-white"
                }`}
            >
                {product.featured ? "Featured" : "No featured"}
            </button>


            <button
                onClick={() => deleteProduct(product.id)}
                className="text-red-500 hover:text-red-400 transition cursor-pointer"
            >
                Eliminar
            </button>

            <button
                onClick={() => {

                    setEditingProduct(
                        JSON.parse(JSON.stringify(product))
                    );

                    setEditingVariantIndex(0);

                }}
                className="text-blue-500 hover:text-blue-400 transition cursor-pointer"
            >
                Editar
            </button>

      </div>

    ))}

  </div>

</div>

      

    </main>
  );
}