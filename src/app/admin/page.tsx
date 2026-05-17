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
const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
const [imageFiles, setImageFiles] = useState<File[]>([]);
const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
const [category, setCategory] = useState("remeras");
const [sizes, setSizes] = useState("S,M,L");
const [description, setDescription] = useState("");
const [stock, setStock] = useState("");
const [color, setColor] = useState("Negro");
const [colorHex, setColorHex] = useState("#000000");


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

  let imageUrls = ["/editorial/1.png"];

  if (imageFiles.length > 0) {

    imageUrls = [];

    for (const file of imageFiles) {

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
        stock: Number(stock),

        details: [
          "Algodón premium",
          "Fit oversized",
          "Industria argentina",
        ],

        images: imageUrls,

        variants: [
          {
            color,
            hex: colorHex,
            images: imageUrls,
          },
        ],

        sizes: sizes.split(","),

        featured: false,
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
    setStock("");
    setColor("Negro");
    setColorHex("#000000");
    setImageFiles([]);
    setSizes("S,M,L");

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

  let imageUrls = [...(editingProduct.images || [])];

  if (editImageFiles.length > 0) {

    imageUrls = [...editingProduct.images];

    for (const file of editImageFiles) {

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

  }

  const { error } = await supabase
    .from("products")
    .update({
      name: editingProduct.name,
      slug: editingProduct.slug,
      price: Number(editingProduct.price),

      category: editingProduct.category,
      sizes: editingProduct.sizes,
      description: editingProduct.description,
      stock: Number(editingProduct.stock),

      images: imageUrls,

      variants: [
        {
          color: editingProduct.color,
          hex: editingProduct.hex,
          images: imageUrls,
        },
      ],
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

        <input
            type="text"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="w-20 h-12 rounded-xl overflow-hidden bg-transparent cursor-pointer"
        />

        <input
            type="text"
            placeholder="Talles: S,M,L"
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <textarea
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[140px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
        />

        <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="file"
            multiple
            onChange={(e) =>
                setImageFiles(Array.from(e.target.files || []))
        }
            className="text-sm text-zinc-400"
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

        <input
            type="text"
            value={editingProduct.color}
            onChange={(e) =>
                setEditingProduct({
                    ...editingProduct,
                    color: e.target.value,
                })
            }
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="color"
            value={editingProduct.hex || "#000000"}
            onChange={(e) =>
                setEditingProduct({
                    ...editingProduct,
                    hex: e.target.value,
                })
            }
            className="w-20 h-12 rounded-xl overflow-hidden bg-transparent cursor-pointer"
        />

        <input
            type="text"
            value={editingProduct.sizes?.join(",")}
            onChange={(e) =>
                setEditingProduct({
                    ...editingProduct,
                    sizes: e.target.value.split(","),
                })
            }
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

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

        <input
            type="number"
            placeholder="Stock"
            value={editingProduct.stock}
            onChange={(e) =>
                setEditingProduct({
                    ...editingProduct,
                    stock: e.target.value,
                })
            }
            className="h-12 px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
            type="file"
            multiple
            onChange={(e) =>
                setEditImageFiles(Array.from(e.target.files || []))
        }
            className="text-sm text-zinc-400"
        />        

        <div className="flex gap-3 flex-wrap">

            {editingProduct.images?.map((image: string) => (

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
                        onClick={() =>
                            setEditingProduct({
                                ...editingProduct,
                                images: editingProduct.images.filter(
                                    (img: string) => img !== image
                                ),
                            })
                        }
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:bg-red-400 transition cursor-pointer"
                    >
                        ✕
                    </button>

                    <div className="absolute bottom-1 left-1 flex gap-1">

                        <button
                            onClick={() => {

                                const index = editingProduct.images.indexOf(image);

                                if (index === 0) return;

                                const updated = [...editingProduct.images];

                                [updated[index - 1], updated[index]] =
                                [updated[index], updated[index - 1]];

                                setEditingProduct({
                                    ...editingProduct,
                                    images: updated,
                                });

                            }}
                            className="w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                        >
                            ←
                        </button>

                        <button
                            onClick={() => {

                            const index = editingProduct.images.indexOf(image);

                                if (index === editingProduct.images.length - 1) return;

                                const updated = [...editingProduct.images];

                                [updated[index + 1], updated[index]] =
                                [updated[index], updated[index + 1]];

                                setEditingProduct({
                                    ...editingProduct,
                                    images: updated,
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
                onClick={() =>
                    setEditingProduct({
                        ...product,
                        color: product.variants?.[0]?.color || "",
                        hex: product.variants?.[0]?.hex || "#000000",
                    })
                }
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