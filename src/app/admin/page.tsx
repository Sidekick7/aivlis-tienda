"use client";

import { type FormEvent, useEffect, useState } from "react";
import { categories } from "@/config/store";
import { supabase } from "@/lib/supabase";
import { getProducts } from "@/lib/products";
import { getAdminOrders, updateOrderStatus } from "@/lib/orders";
import AdminOrdersSection from "@/app/admin/AdminOrdersSection";
import AdminProductsSection from "@/app/admin/AdminProductsSection";
import CreateProductModal from "@/app/admin/CreateProductModal";
import EditProductModal from "@/app/admin/EditProductModal";
import {
  createEmptyProductVariant,
  formatDetailsText,
  slugifyProductName,
} from "@/app/admin/adminUtils";
import {
  createAdminProduct,
  deleteAdminProduct,
  getProductFormError,
  getProductMutationError,
  updateAdminProduct,
  updateAdminProductFeatured,
} from "@/app/admin/adminProductMutations";
import type {
  AdminSection,
  EditableProduct,
  NewProductVariant,
} from "@/app/admin/adminTypes";
import type { Product } from "@/types/product";
import type { AdminOrder, OrderStatus } from "@/types/order";
import type { Session } from "@supabase/supabase-js";

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
const [productFormError, setProductFormError] = useState("");
const [name, setName] = useState("");
const [slug, setSlug] = useState("");
const [isSlugEdited, setIsSlugEdited] = useState(false);
const [price, setPrice] = useState("");
const [products, setProducts] = useState<Product[]>([]);
const [orders, setOrders] = useState<AdminOrder[]>([]);
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
  createEmptyProductVariant(),
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
  setProductFormError("");

  const nextSlug = slug || slugifyProductName(name);
  const validationError = getProductFormError({
    productName: name,
    productSlug: nextSlug,
    productPrice: price,
    productCategory: category,
    productVariants: variants,
  });

  if (validationError) {
    setProductFormError(validationError);
    return;
  }

  if (products.some((product) => product.slug === nextSlug)) {
    setProductFormError("Ya existe un producto con ese slug.");
    return;
  }

  try {
    await createAdminProduct({
      name,
      slug: nextSlug,
      price,
      category,
      description,
      detailsText,
      variants,
    });
  } catch (error) {
    setProductFormError(
      error && typeof error === "object"
        ? getProductMutationError(error)
        : "No se pudo guardar el producto."
    );
    return;
  }

    await refreshProducts();

    setShowCreate(false);

    setName("");
    setSlug("");
    setIsSlugEdited(false);
    setPrice("");
    setDescription("");
    setDetailsText("");
    setCategory(categories[0].value);

    setVariants([
        createEmptyProductVariant(),
    ]);

    setSelectedVariantIndex(0);

    alert("Producto creado");

};





const deleteProduct = async (id: number) => {

  const shouldDelete = window.confirm(
    "Seguro que queres eliminar este producto?"
  );

  if (!shouldDelete) return;

  try {
    await deleteAdminProduct(id);
  } catch (error) {
    alert(
      error instanceof Error
        ? `No se pudo eliminar el producto: ${error.message}`
        : "No se pudo eliminar el producto."
    );
    return;
  }

    setProducts((prev) =>
      prev.filter((product) => product.id !== id)
    );

};

const toggleFeaturedProduct = async (product: Product) => {
  try {
    await updateAdminProductFeatured(product);
  } catch (error) {
    alert(
      error instanceof Error
        ? `No se pudo actualizar destacado: ${error.message}`
        : "No se pudo actualizar destacado."
    );
    return;
  }

  await refreshProducts();
};

const startEditingProduct = (product: Product) => {
  setProductFormError("");
  setEditingProduct(
    JSON.parse(JSON.stringify(product))
  );

  setEditingDetailsText(
    formatDetailsText(product.details)
  );

  setEditingVariantIndex(0);
};

const updateProduct = async () => {

    if (!editingProduct) return;

    setProductFormError("");

    const nextSlug = slugifyProductName(editingProduct.slug);
    const validationError = getProductFormError({
      productName: editingProduct.name,
      productSlug: nextSlug,
      productPrice: editingProduct.price,
      productCategory: editingProduct.category,
      productVariants: editingProduct.variants,
    });

    if (validationError) {
      setProductFormError(validationError);
      return;
    }

    if (
      products.some(
        (product) =>
          product.slug === nextSlug &&
          product.id !== editingProduct.id
      )
    ) {
      setProductFormError("Ya existe un producto con ese slug.");
      return;
    }

    try {
      await updateAdminProduct({
        product: editingProduct,
        slug: nextSlug,
        detailsText: editingDetailsText,
      });
    } catch (error) {
      setProductFormError(
        error && typeof error === "object"
          ? getProductMutationError(error)
          : "No se pudo guardar el producto."
      );
      return;
    }

    await refreshProducts();
    setEditingProduct(null);

    alert("Producto actualizado");

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
    setAuthMessage(`No se pudo iniciar sesión: ${error.message}`);
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
          Entra con tu email y contraseña para administrar la tienda.
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
                onClick={() => {
                  setProductFormError("");
                  setShowCreate(true);
                }}
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
  <CreateProductModal
    productFormError={productFormError}
    name={name}
    setName={setName}
    slug={slug}
    setSlug={setSlug}
    isSlugEdited={isSlugEdited}
    setIsSlugEdited={setIsSlugEdited}
    price={price}
    setPrice={setPrice}
    category={category}
    setCategory={setCategory}
    description={description}
    setDescription={setDescription}
    detailsText={detailsText}
    setDetailsText={setDetailsText}
    variants={variants}
    setVariants={setVariants}
    selectedVariantIndex={selectedVariantIndex}
    setSelectedVariantIndex={setSelectedVariantIndex}
    onClose={() => {
      setProductFormError("");
      setShowCreate(false);
    }}
    onCreate={createProduct}
  />
)}

{editingProduct && (
  <EditProductModal
    product={editingProduct}
    setProduct={setEditingProduct}
    productFormError={productFormError}
    detailsText={editingDetailsText}
    setDetailsText={setEditingDetailsText}
    editingVariantIndex={editingVariantIndex}
    setEditingVariantIndex={setEditingVariantIndex}
    onClose={() => {
      setProductFormError("");
      setEditingProduct(null);
    }}
    onSave={updateProduct}
  />
)}

{activeSection === "orders" && (
  <AdminOrdersSection
    orders={orders}
    isLoading={isOrdersLoading}
    error={orderError}
    onRefresh={refreshOrders}
    onStatusChange={handleOrderStatusChange}
  />
)}
{activeSection === "products" && (
  <AdminProductsSection
    products={products}
    onToggleFeatured={toggleFeaturedProduct}
    onDelete={deleteProduct}
    onEdit={startEditingProduct}
  />
)}
    </main>
  );
}


