"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { categories, fallbackProductImage } from "@/config/store";
import { supabase } from "@/lib/supabase";
import { getProducts } from "@/lib/products";
import { getAdminOrders, updateOrderStatus } from "@/lib/orders";
import type { Product, ProductVariantSize } from "@/types/product";
import type { AdminOrder, OrderStatus } from "@/types/order";
import type { Session } from "@supabase/supabase-js";


type NewProductVariant = {
  color: string;
  hex: string;
  sizes: {
    size: string;
    stock: string;
  }[];
  images: File[];
};

type EditableVariant = {
  color: string;
  hex: string;
  sizes: ProductVariantSize[];
  images: (string | File)[];
};

type EditableProduct = Omit<Product, "price" | "variants"> & {
  price: number | string;
  variants: EditableVariant[];
};

type AdminSection = "products" | "orders";
type ProductFilter = "all" | "featured" | "in_stock" | "out_of_stock";
type OrderFilter = "all" | OrderStatus;

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const orderStatusClasses: Record<OrderStatus, string> = {
  pending_payment: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

function parseDetailsText(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDetailsText(details: string[]) {
  return details.join("\n");
}

function getProductImage(product: Product) {
  return (
    product.images[0] ||
    product.variants.find((variant) => variant.images.length > 0)
      ?.images[0] ||
    fallbackProductImage
  );
}

function getProductTotalStock(product: Product) {
  return product.variants.reduce(
    (total, variant) =>
      total +
      variant.sizes.reduce(
        (variantTotal, size) => variantTotal + size.stock,
        0
      ),
    0
  );
}

function getVariantStock(variant: {
  sizes: { stock: string | number }[];
}) {
  return variant.sizes.reduce(
    (total, sizeItem) => total + Number(sizeItem.stock || 0),
    0
  );
}

export default function AdminPage() {

const [session, setSession] = useState<Session | null>(null);
const [isAuthLoading, setIsAuthLoading] = useState(true);
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authMessage, setAuthMessage] = useState("");
const [isSendingLogin, setIsSendingLogin] = useState(false);
const [activeSection, setActiveSection] =
  useState<AdminSection>("products");
const [showCreate, setShowCreate] = useState(false);
const [name, setName] = useState("");
const [slug, setSlug] = useState("");
const [price, setPrice] = useState("");
const [products, setProducts] = useState<Product[]>([]);
const [productSearch, setProductSearch] = useState("");
const [productFilter, setProductFilter] =
  useState<ProductFilter>("all");
const [productCategoryFilter, setProductCategoryFilter] =
  useState("all");
const [orders, setOrders] = useState<AdminOrder[]>([]);
const [orderSearch, setOrderSearch] = useState("");
const [orderFilter, setOrderFilter] =
  useState<OrderFilter>("all");
const [expandedOrderId, setExpandedOrderId] =
  useState<string | null>(null);
const [isOrdersLoading, setIsOrdersLoading] = useState(false);
const [orderError, setOrderError] = useState("");
const [editingProduct, setEditingProduct] =
  useState<EditableProduct | null>(null);
const [editingDetailsText, setEditingDetailsText] = useState("");
const [category, setCategory] = useState(categories[0].value);
const [description, setDescription] = useState("");
const [detailsText, setDetailsText] = useState("");

const [editingVariantIndex, setEditingVariantIndex] = useState(0);

const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
const [variants, setVariants] = useState<NewProductVariant[]>([
  {
    color: "Negro",
    hex: "#000000",
    sizes: [
      {
        size: "S",
        stock: "",
      },
    ],
    images: [],
  },
]);


useEffect(() => {

  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setIsAuthLoading(false);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    setSession(nextSession);
    setIsAuthLoading(false);
  });

  return () => subscription.unsubscribe();

}, []);

const refreshProducts = async () => {
  const products = await getProducts();

  setProducts(products);
};

const refreshOrders = async () => {
  setIsOrdersLoading(true);
  setOrderError("");

  try {
    const orders = await getAdminOrders();

    setOrders(orders);
  } catch (error) {
    setOrderError(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los pedidos"
    );
  } finally {
    setIsOrdersLoading(false);
  }
};

useEffect(() => {

  if (!session) return;

  getProducts().then(setProducts);
  Promise.resolve().then(refreshOrders);

}, [session]);

const createProduct = async () => {

  const processedVariants: {
    color: string;
    hex: string;
    stock: number;
    sizes: {
        size: string;
        stock: number;
    }[];
    images: string[];
  }[] = [];

  for (const variant of variants) {

    const imageUrls: string[] = [];

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
      stock: getVariantStock(variant),
      sizes: variant.sizes.map((sizeItem) => ({
        size: sizeItem.size,
        stock: Number(sizeItem.stock),
      })),
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
        stock: processedVariants.reduce(
          (total, variant) => total + variant.stock,
          0
        ),

        details: parseDetailsText(detailsText),

        featured: false,

        variants: processedVariants,

        images: processedVariants[0]?.images || [],
      },
    ]);

  if (error) {
    alert("No se pudo crear el producto");
    return;
  }

    await refreshProducts();

    setShowCreate(false);

    setName("");
    setSlug("");
    setPrice("");
    setDescription("");
    setDetailsText("");
    setCategory(categories[0].value);

    setVariants([
        {
            color: "Negro",
            hex: "#000000",
            sizes: [
            {
                size: "S",
                stock: "",
            },
            ],
            images: [],
        },
    ]);

    setSelectedVariantIndex(0);

    alert("Producto creado");

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

    if (!editingProduct) return;

    const processedVariants: {
        color: string;
        hex: string;
        stock: number;
        sizes: {
            size: string;
            stock: number;
        }[];
        images: string[];
    }[] = [];

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
                stock: getVariantStock(variant),
                sizes: variant.sizes.map((sizeItem) => ({
                    size: sizeItem.size,
                    stock: Number(sizeItem.stock),
                })),
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
      details: parseDetailsText(editingDetailsText),
      stock: processedVariants.reduce(
        (total, variant) => total + variant.stock,
        0
      ),

      variants: processedVariants,

      images: processedVariants[0]?.images || [],
      
    })
    .eq("id", editingProduct.id);

  if (!error) {

    await refreshProducts();
    setEditingProduct(null);

    alert("Producto actualizado");

  }

};

const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  setAuthMessage("");
  setIsSendingLogin(true);

  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail.trim(),
    password: authPassword,
  });

  setIsSendingLogin(false);

  if (error) {
    setAuthMessage(`No se pudo iniciar sesion: ${error.message}`);
    return;
  }

  setAuthPassword("");
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  setSession(null);
  setOrders([]);
  setProducts([]);
};

const handleOrderStatusChange = async (
  order: AdminOrder,
  status: OrderStatus
) => {
  try {
    await updateOrderStatus(order, status);
    await Promise.all([
      refreshOrders(),
      refreshProducts(),
    ]);
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el pedido"
    );
  }
};

const selectedVariant = variants[selectedVariantIndex];
const editingVariant =
  editingProduct?.variants?.[editingVariantIndex];
const normalizedProductSearch = productSearch
  .trim()
  .toLowerCase();
const filteredProducts = normalizedProductSearch
  ? products.filter((product) =>
      [
        product.name,
        product.slug,
        product.category,
        product.sku ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedProductSearch)
    )
  : products;
const visibleProducts = filteredProducts.filter((product) => {
  const totalStock = getProductTotalStock(product);
  const matchesCategory =
    productCategoryFilter === "all" ||
    product.category === productCategoryFilter;

  if (!matchesCategory) return false;
  if (productFilter === "featured") return product.featured;
  if (productFilter === "in_stock") return totalStock > 0;
  if (productFilter === "out_of_stock") return totalStock <= 0;

  return true;
});
const normalizedOrderSearch = orderSearch
  .trim()
  .toLowerCase();
const visibleOrders = orders.filter((order) => {
  const matchesFilter =
    orderFilter === "all" || order.status === orderFilter;
  const matchesSearch =
    !normalizedOrderSearch ||
    [
      order.orderNumber,
      order.customerName,
      order.customerDni,
      order.customerWhatsapp,
      order.customerEmail ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedOrderSearch);

  return matchesFilter && matchesSearch;
});

if (isAuthLoading) {
  return (
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-32 md:px-10 flex items-center justify-center">
      <p className="text-zinc-400">
        Cargando admin...
      </p>
    </main>
  );
}

if (!session) {
  return (
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-32 flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-zinc-900 rounded-3xl p-8"
      >
        <h1 className="text-4xl font-bold">
          Admin
        </h1>

        <p className="text-zinc-400 mt-3">
          Entra con tu email y contrasena para administrar la tienda.
        </p>

        <input
          type="email"
          placeholder="tu@email.com"
          value={authEmail}
          onChange={(event) => setAuthEmail(event.target.value)}
          required
          className="mt-8 h-12 w-full px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <input
          type="password"
          placeholder="Contrasena"
          value={authPassword}
          onChange={(event) => setAuthPassword(event.target.value)}
          required
          className="mt-4 h-12 w-full px-4 rounded-xl bg-zinc-800 outline-none"
        />

        <button
          type="submit"
          disabled={isSendingLogin}
          className="mt-4 h-12 w-full bg-white text-black rounded-xl font-semibold hover:opacity-90 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSendingLogin ? "Entrando..." : "Entrar"}
        </button>

        {authMessage && (
          <p className="text-sm text-zinc-400 mt-4">
            {authMessage}
          </p>
        )}
      </form>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-32 md:px-10">

      <div className="flex items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-bold">
            Admin
          </h1>

          <p className="text-zinc-500 mt-2">
            {session.user.email}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-zinc-800 text-white px-5 h-11 rounded-xl font-semibold hover:bg-zinc-700 transition cursor-pointer"
        >
          Salir
        </button>
      </div>

      <div className="mb-8 flex w-full rounded-2xl bg-zinc-900 p-1 md:w-fit">
        <button
          type="button"
          onClick={() => setActiveSection("products")}
          className={`h-11 flex-1 rounded-xl px-5 font-semibold transition cursor-pointer md:flex-none ${
            activeSection === "products"
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Productos ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("orders")}
          className={`h-11 flex-1 rounded-xl px-5 font-semibold transition cursor-pointer md:flex-none ${
            activeSection === "orders"
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Pedidos ({orders.length})
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

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

        <div className="bg-zinc-900 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">
            Pedidos
            </h2>

            <p className="text-zinc-400 mt-2">
            {orders.length} tickets cargados
            </p>
            <button
                onClick={refreshOrders}
                className="mt-6 bg-zinc-800 text-white px-5 h-11 rounded-xl font-semibold hover:bg-zinc-700 transition cursor-pointer"
            >
                Actualizar
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

        <div className="flex flex-col gap-3">

            {selectedVariant.sizes.map((sizeItem, index) => (

                <div
                key={index}
                className="flex gap-3"
                >

                <input
                    type="text"
                    placeholder="Talle"
                    value={sizeItem.size}
                    onChange={(e) => {

                    const updated = [...variants];

                    updated[selectedVariantIndex]
                        .sizes[index]
                        .size = e.target.value;

                    setVariants(updated);

                    }}
                    className="h-12 px-4 rounded-xl bg-zinc-800 outline-none flex-1"
                />

                <input
                    type="number"
                    placeholder="Stock"
                    value={sizeItem.stock}
                    onChange={(e) => {

                    const updated = [...variants];

                    updated[selectedVariantIndex]
                        .sizes[index]
                        .stock = e.target.value;

                    setVariants(updated);

                    }}
                    className="h-12 px-4 rounded-xl bg-zinc-800 outline-none w-32"
                />

                <button
                    type="button"
                    onClick={() => {

                    const updated = [...variants];

                    updated[selectedVariantIndex].sizes =
                        updated[selectedVariantIndex]
                        .sizes
                        .filter((_, i) => i !== index);

                    setVariants(updated);

                    }}
                    className="w-12 rounded-xl bg-red-500"
                >
                    ✕
                </button>

                </div>

            ))}

            <button
                type="button"
                onClick={() => {

                const updated = [...variants];

                updated[selectedVariantIndex].sizes.push({
                    size: "",
                    stock: "",
                });

                setVariants(updated);

                }}
                className="h-11 rounded-xl border border-dashed border-zinc-600"
            >
                + Agregar talle
            </button>

        </div>

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

                    <Image
                        src={URL.createObjectURL(file)}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
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

            {categories.map((categoryOption) => (
                <option
                    key={categoryOption.value}
                    value={categoryOption.value}
                >
                    {categoryOption.label}
                </option>
            ))}

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
                            sizes: [
                                {
                                size: "S",
                                stock: "",
                                },
                            ],
                            images: [],
                        }
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

        <textarea
            placeholder="Detalles del producto, uno por linea"
            value={detailsText}
            onChange={(e) => setDetailsText(e.target.value)}
            className="min-h-[110px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
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

            {categories.map((categoryOption) => (
                <option
                    key={categoryOption.value}
                    value={categoryOption.value}
                >
                    {categoryOption.label}
                </option>
            ))}

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

        <textarea
            value={editingDetailsText}
            onChange={(e) => setEditingDetailsText(e.target.value)}
            placeholder="Detalles del producto, uno por linea"
            className="min-h-[110px] p-4 rounded-xl bg-zinc-800 outline-none resize-none"
        />

        <div className="flex flex-wrap gap-2">

            {editingProduct?.variants?.map((variant, index) => (

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

        <div className="flex flex-col gap-3">

            {editingVariant?.sizes?.map(
                (sizeItem, index) => (

                <div
                    key={index}
                    className="flex gap-3"
                >

                    <input
                    type="text"
                    value={sizeItem.size}
                    onChange={(e) => {

                        const updated = [...editingProduct.variants];

                        updated[editingVariantIndex]
                        .sizes[index]
                        .size = e.target.value;

                        setEditingProduct({
                        ...editingProduct,
                        variants: updated,
                        });

                    }}
                    className="h-12 px-4 rounded-xl bg-zinc-800 outline-none flex-1"
                    />

                    <input
                    type="number"
                    value={sizeItem.stock}
                    onChange={(e) => {

                        const updated = [...editingProduct.variants];

                        updated[editingVariantIndex]
                        .sizes[index]
                        .stock = Number(e.target.value);

                        setEditingProduct({
                        ...editingProduct,
                        variants: updated,
                        });

                    }}
                    className="h-12 px-4 rounded-xl bg-zinc-800 outline-none w-32"
                    />

                    <button
                    type="button"
                    onClick={() => {

                        const updated = [...editingProduct.variants];

                        updated[editingVariantIndex].sizes =
                        updated[editingVariantIndex]
                            .sizes
                            .filter((_, i) =>
                            i !== index
                            );

                        setEditingProduct({
                        ...editingProduct,
                        variants: updated,
                        });

                    }}
                    className="w-12 rounded-xl bg-red-500"
                    >
                    ✕
                    </button>

            </div>

                )
            )}

            <button
                type="button"
                onClick={() => {

                const updated = [...editingProduct.variants];

                updated[editingVariantIndex].sizes.push({
                    size: "",
                    stock: 0,
                });

                setEditingProduct({
                    ...editingProduct,
                    variants: updated,
                });

                }}
                className="h-11 rounded-xl border border-dashed border-zinc-600"
            >
                + Agregar talle
            </button>

            </div>


  
        <input
            type="file"
            multiple
            onChange={(e) => {
                const updated = [...editingProduct.variants];

                updated[editingVariantIndex].images = [
                    ...updated[editingVariantIndex].images,
                    ...Array.from(e.target.files || []),
                ];

                setEditingProduct({
                    ...editingProduct,
                    variants: updated,
                });
            }}
            className="text-sm text-zinc-400"
        />        

        <div className="flex gap-3 flex-wrap">

            {editingVariant?.images?.map((image) => {
                const imageUrl =
                    typeof image === "string"
                    ? image
                    : URL.createObjectURL(image);

                return (

                <div
                    key={imageUrl}
                    className="relative"
                >

                    <Image
                    src={imageUrl}
                    alt=""
                    width={80}
                    height={80}
                    unoptimized={typeof image !== "string"}
                    className="w-20 h-20 object-cover rounded-xl border border-zinc-700"
                    />

                    <button
                        onClick={() => {

                            const updated = [...editingProduct.variants];

                            updated[editingVariantIndex].images =
                                updated[editingVariantIndex].images.filter(
                                    (img) => img !== image
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

                );
            })}

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

{activeSection === "orders" && (
<section className="mt-10 bg-zinc-900 rounded-3xl p-6">

  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
    <div>
      <h2 className="text-3xl font-bold">
        Pedidos
      </h2>

      <p className="text-zinc-400 mt-2">
        {visibleOrders.length} de {orders.length} tickets
      </p>
    </div>

    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative w-full md:w-80">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
        />

        <input
          type="search"
          placeholder="Buscar ticket, cliente o WhatsApp"
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
          className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 outline-none transition focus:border-zinc-500"
        />
      </div>

      <button
        type="button"
        onClick={refreshOrders}
        className="h-11 px-5 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition cursor-pointer"
      >
        Actualizar
      </button>
    </div>
  </div>

  <div className="mb-6 flex flex-wrap gap-2">
    {([
      ["all", "Todos"],
      ["pending_payment", "Pendientes"],
      ["confirmed", "Confirmados"],
      ["cancelled", "Cancelados"],
    ] as [OrderFilter, string][]).map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() => setOrderFilter(value)}
        className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
          orderFilter === value
            ? "bg-white text-black"
            : "bg-zinc-800 text-zinc-300 hover:text-white"
        }`}
      >
        {label}
      </button>
    ))}
  </div>

  {orderError && (
    <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
      {orderError}
    </p>
  )}

  {isOrdersLoading && (
    <p className="text-zinc-400">
      Cargando pedidos...
    </p>
  )}

  {!isOrdersLoading && orders.length === 0 && (
    <p className="text-zinc-400">
      Todavia no hay tickets cargados.
    </p>
  )}

  {!isOrdersLoading && orders.length > 0 && visibleOrders.length === 0 && (
    <p className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
      No hay pedidos que coincidan con los filtros.
    </p>
  )}

  <div className="flex flex-col gap-4">

    {visibleOrders.map((order) => (

      <article
        key={order.id}
        className="bg-zinc-800 rounded-2xl p-4"
      >

        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr_1fr] lg:items-center">

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold">
                {order.orderNumber}
              </h3>

              <span
                className={`text-xs px-3 py-1 rounded-full border ${orderStatusClasses[order.status]}`}
              >
                {orderStatusLabels[order.status]}
              </span>
            </div>

            <p className="text-zinc-400 mt-2">
              {new Date(order.createdAt).toLocaleString("es-AR")} · {currencyFormatter.format(order.total)}
            </p>

            <p className="text-zinc-300 mt-4">
              {order.customerName} · DNI {order.customerDni}
            </p>

            {expandedOrderId === order.id && (
            <>
            <p className="text-zinc-400 text-sm mt-1">
              {order.customerAddress}, {order.customerCity}, {order.customerProvince} ({order.customerZip})
            </p>

            <p className="text-zinc-400 text-sm mt-1">
              WhatsApp: {order.customerWhatsapp}
              {order.customerEmail ? ` · Email: ${order.customerEmail}` : ""}
            </p>

            {order.notes && (
              <p className="text-zinc-300 text-sm mt-3">
                Nota: {order.notes}
              </p>
            )}
            </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() =>
                setExpandedOrderId((currentId) =>
                  currentId === order.id ? null : order.id
                )
              }
              className="h-10 px-4 rounded-xl text-sm font-semibold bg-zinc-700 text-white hover:bg-zinc-600 transition cursor-pointer"
            >
              {expandedOrderId === order.id ? "Ocultar" : "Ver detalle"}
            </button>

            {(["pending_payment", "confirmed", "cancelled"] as OrderStatus[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleOrderStatusChange(order, status)}
                  disabled={order.status === status}
                  className={`h-10 px-4 rounded-xl text-sm font-semibold transition cursor-pointer disabled:cursor-default ${
                    order.status === status
                      ? "bg-white text-black"
                      : "bg-zinc-700 text-white hover:bg-zinc-600"
                  }`}
                >
                  {orderStatusLabels[status]}
                </button>
              )
            )}
          </div>

        </div>

        {expandedOrderId === order.id && (
        <div className="mt-5 grid gap-3">

          {order.items.map((item) => (

            <div
              key={item.id}
              className="flex items-center justify-between gap-4 border-t border-zinc-700 pt-3"
            >

              <div className="flex items-center gap-3 min-w-0">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                )}

                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {item.productName}
                  </p>

                  <p className="text-zinc-400 text-sm">
                    {item.variantColor || "Sin color"} · Talle {item.size || "-"} · x{item.quantity}
                  </p>
                </div>
              </div>

              <p className="text-zinc-300 font-semibold shrink-0">
                {currencyFormatter.format(item.subtotal)}
              </p>

            </div>

          ))}

        </div>
        )}

      </article>

    ))}

  </div>

</section>
)}

{activeSection === "products" && (
<div className="mt-10 bg-zinc-900 rounded-3xl p-6">

  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
    <div>
      <h2 className="text-3xl font-bold">
        Productos
      </h2>

      <p className="text-zinc-400 mt-2">
        {visibleProducts.length} de {products.length} productos
      </p>
    </div>

    <div className="relative w-full lg:max-w-sm">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
      />

      <input
        type="search"
        placeholder="Buscar por nombre, slug, categoria o SKU"
        value={productSearch}
        onChange={(event) => setProductSearch(event.target.value)}
        className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 outline-none transition focus:border-zinc-500"
      />
    </div>
  </div>

  <div className="mb-6 flex flex-wrap gap-2">
    {([
      ["all", "Todos"],
      ["featured", "Destacados"],
      ["in_stock", "Con stock"],
      ["out_of_stock", "Sin stock"],
    ] as [ProductFilter, string][]).map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() => {
          setProductFilter(value);

          if (value === "all") {
            setProductCategoryFilter("all");
            setProductSearch("");
          }
        }}
        className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
          productFilter === value &&
          (value !== "all" || productCategoryFilter === "all")
            ? "bg-white text-black"
            : "bg-zinc-800 text-zinc-300 hover:text-white"
        }`}
      >
        {label}
      </button>
    ))}

    {categories.map((categoryOption) => (
      <button
        key={categoryOption.value}
        type="button"
        onClick={() => {
          setProductCategoryFilter(categoryOption.value);
          setProductFilter("all");
        }}
        className={`h-10 rounded-xl px-4 text-sm font-semibold transition cursor-pointer ${
          productCategoryFilter === categoryOption.value
            ? "bg-white text-black"
            : "bg-zinc-800 text-zinc-300 hover:text-white"
        }`}
      >
        {categoryOption.label}
      </button>
    ))}
  </div>

  {visibleProducts.length === 0 && (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
      No hay productos que coincidan con la busqueda.
    </div>
  )}

  <div className="flex flex-col gap-4">

    {visibleProducts.map((product) => (

      <div
        key={product.id}
        className="grid gap-4 rounded-2xl bg-zinc-800 p-4 lg:grid-cols-[minmax(260px,1fr)_130px_120px_130px_220px] lg:items-center"
      >

        <div className="flex items-center gap-4 min-w-0">
          <Image
            src={getProductImage(product)}
            alt={product.name}
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-xl object-cover bg-zinc-900"
          />

          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold">
              {product.name}
            </h3>

            <p className="mt-1 truncate text-sm text-zinc-500">
              /product/{product.slug}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              {product.variants.length} colores
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase text-zinc-500">
            Precio
          </p>

          <p className="mt-1 font-semibold">
            {currencyFormatter.format(product.price)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-zinc-500">
            Stock
          </p>

          <p className="mt-1 font-semibold">
            {getProductTotalStock(product)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-zinc-500">
            Categoria
          </p>

          <p className="mt-1 capitalize text-zinc-300">
            {product.category}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <button
                onClick={async () => {

                  await supabase
                    .from("products")
                    .update({
                        featured: !product.featured,
                    })
                    .eq("id", product.id);

                  await refreshProducts();

                }}
                className={`px-4 h-10 rounded-xl font-medium transition cursor-pointer ${
                    product.featured
                    ? "bg-white text-black"
                    : "bg-zinc-700 text-white"
                }`}
            >
                {product.featured ? "Destacado" : "No destacado"}
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

                    setEditingDetailsText(
                        formatDetailsText(product.details)
                    );

                    setEditingVariantIndex(0);

                }}
                className="text-blue-500 hover:text-blue-400 transition cursor-pointer"
            >
                Editar
            </button>
        </div>

      </div>

    ))}

  </div>

</div>

)}

    </main>
  );
}
