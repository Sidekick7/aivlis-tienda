"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getFallbackCategories,
  updateCategory,
} from "@/lib/categories";
import { getProducts } from "@/lib/products";
import {
  fallbackHomeContent,
  getHomeContent,
  updateHomeContent,
  uploadHomeImage,
} from "@/lib/homeContent";
import {
  deleteOrder,
  getAdminOrders,
  updateOrderInternalNotes,
  updateOrderStatus,
} from "@/lib/orders";
import { formatOrderNumber } from "@/lib/orderNumber";
import AdminCategoriesSection from "@/app/admin/AdminCategoriesSection";
import AdminHomeSection from "@/app/admin/AdminHomeSection";
import AdminLocalSaleSection from "@/app/admin/AdminLocalSaleSection";
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
  updateAdminProductActive,
  updateAdminProduct,
  updateAdminProductFeatured,
} from "@/app/admin/adminProductMutations";
import type {
  AdminSection,
  EditableProduct,
  NewProductVariant,
} from "@/app/admin/adminTypes";
import type { StoreCategory } from "@/types/category";
import type { HomeContent } from "@/types/homeContent";
import type { Product } from "@/types/product";
import type { AdminOrder, OrderStatus } from "@/types/order";
import type { Session } from "@supabase/supabase-js";

type AdminNotice = {
  type: "success" | "error";
  message: string;
};

type SavingProductAction = {
  id: number;
  action: "featured" | "active" | "delete";
};

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

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
const [categoryOptions, setCategoryOptions] = useState<StoreCategory[]>(
  getFallbackCategories()
);
const [categoryError, setCategoryError] = useState("");
const [isSavingCategory, setIsSavingCategory] = useState(false);
const [homeContent, setHomeContent] =
  useState<HomeContent>(fallbackHomeContent);
const [homeContentError, setHomeContentError] = useState("");
const [isSavingHomeContent, setIsSavingHomeContent] = useState(false);
const [isUploadingHomeImage, setIsUploadingHomeImage] = useState(false);
const [orders, setOrders] = useState<AdminOrder[]>([]);
const [isOrdersLoading, setIsOrdersLoading] = useState(false);
const [orderError, setOrderError] = useState("");
const [adminNotice, setAdminNotice] =
  useState<AdminNotice | null>(null);
const [isCreatingProduct, setIsCreatingProduct] = useState(false);
const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
const [savingProductAction, setSavingProductAction] =
  useState<SavingProductAction | null>(null);
const [editingProduct, setEditingProduct] =
  useState<EditableProduct | null>(null);
const [editingDetailsText, setEditingDetailsText] = useState("");
const [category, setCategory] = useState(
  getFallbackCategories()[0]?.value ?? ""
);
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
  const products = await getProducts({
    includeInactive: true,
  });

  setProducts(products);
};

const refreshCategories = async () => {
  setCategoryError("");

  try {
    const categories = await getCategories({
      includeInactive: true,
      fallbackToStatic: false,
    });

    setCategoryOptions(categories);
    setCategory((currentCategory) =>
      categories.some(
        (categoryOption) =>
          categoryOption.value === currentCategory &&
          categoryOption.active
      )
        ? currentCategory
        : categories.find((categoryOption) => categoryOption.active)
            ?.value ?? ""
    );
  } catch (error) {
    setCategoryOptions(getFallbackCategories());
    setCategoryError(
      error instanceof Error
        ? `No se pudieron cargar categorias desde Supabase: ${error.message}. Ejecuta supabase/categories.sql.`
        : "No se pudieron cargar categorias desde Supabase. Ejecuta supabase/categories.sql."
    );
  }
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

const refreshHomeContent = async () => {
  setHomeContentError("");

  try {
    const content = await getHomeContent({
      fallbackToStatic: false,
    });

    setHomeContent(content);
  } catch (error) {
    setHomeContent(fallbackHomeContent);
    setHomeContentError(
      error instanceof Error
        ? `No se pudo cargar Home desde Supabase: ${error.message}. Ejecuta supabase/home-content.sql.`
        : "No se pudo cargar Home desde Supabase. Ejecuta supabase/home-content.sql."
    );
  }
};

useEffect(() => {

  if (!session) return;

  getProducts({
    includeInactive: true,
  }).then(setProducts);
  Promise.resolve().then(refreshCategories);
  Promise.resolve().then(refreshHomeContent);
  Promise.resolve().then(refreshOrders);

}, [session]);

useEffect(() => {
  if (!adminNotice) return;

  const timeout = window.setTimeout(() => {
    setAdminNotice(null);
  }, 3000);

  return () => window.clearTimeout(timeout);
}, [adminNotice]);

const createProduct = async () => {
  if (isCreatingProduct) return;

  setProductFormError("");
  setAdminNotice(null);

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

  setIsCreatingProduct(true);

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

    await refreshProducts();

    setShowCreate(false);

    setName("");
    setSlug("");
    setIsSlugEdited(false);
    setPrice("");
    setDescription("");
    setDetailsText("");
    setCategory(
      categoryOptions.find((categoryOption) => categoryOption.active)
        ?.value ?? ""
    );

    setVariants([
        createEmptyProductVariant(),
    ]);

    setSelectedVariantIndex(0);

    setAdminNotice({
      type: "success",
      message: "Producto creado.",
    });
  } catch (error) {
    setProductFormError(
      error && typeof error === "object"
        ? getProductMutationError(error)
        : "No se pudo guardar el producto."
    );
  } finally {
    setIsCreatingProduct(false);
  }

};

const createStoreCategory = async (
  nextCategory: Omit<StoreCategory, "id">
) => {
  setIsSavingCategory(true);
  setAdminNotice(null);

  try {
    await createCategory(nextCategory);
    await refreshCategories();
    setAdminNotice({
      type: "success",
      message: "Categoria creada.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo crear la categoria: ${error.message}`
          : "No se pudo crear la categoria.",
    });
  } finally {
    setIsSavingCategory(false);
  }
};

const updateStoreCategory = async (
  nextCategory: StoreCategory & { id: number }
) => {
  setIsSavingCategory(true);
  setAdminNotice(null);

  try {
    await updateCategory(nextCategory);
    await refreshCategories();
    setAdminNotice({
      type: "success",
      message: "Categoria actualizada.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo actualizar la categoria: ${error.message}`
          : "No se pudo actualizar la categoria.",
    });
  } finally {
    setIsSavingCategory(false);
  }
};

const normalizeStoreCategoriesOrder = async () => {
  setIsSavingCategory(true);
  setAdminNotice(null);

  try {
    const sortedCategories = [...categoryOptions].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
    );
    const updates = sortedCategories
      .map((categoryOption, index) => ({
        ...categoryOption,
        sortOrder: index + 1,
      }))
      .filter(
        (
          categoryOption
        ): categoryOption is StoreCategory & { id: number } =>
          typeof categoryOption.id === "number"
      );

    await Promise.all(updates.map(updateCategory));
    await refreshCategories();
    setAdminNotice({
      type: "success",
      message: "Orden de categorias reparado.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo reparar el orden: ${error.message}`
          : "No se pudo reparar el orden.",
    });
  } finally {
    setIsSavingCategory(false);
  }
};

const moveStoreCategory = async (
  categoryToMove: StoreCategory & { id: number },
  targetCategory: StoreCategory & { id: number }
) => {
  setIsSavingCategory(true);
  setAdminNotice(null);

  try {
    const sortedCategories = [...categoryOptions].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
    );
    const currentIndex = sortedCategories.findIndex(
      (categoryOption) => categoryOption.id === categoryToMove.id
    );
    const targetIndex = sortedCategories.findIndex(
      (categoryOption) => categoryOption.id === targetCategory.id
    );

    if (currentIndex === -1 || targetIndex === -1) return;

    const nextCategories = [...sortedCategories];
    [nextCategories[currentIndex], nextCategories[targetIndex]] = [
      nextCategories[targetIndex],
      nextCategories[currentIndex],
    ];

    const updates = nextCategories
      .map((categoryOption, index) => ({
        ...categoryOption,
        sortOrder: index + 1,
      }))
      .filter(
        (
          categoryOption
        ): categoryOption is StoreCategory & { id: number } =>
          typeof categoryOption.id === "number"
      );

    await Promise.all(updates.map(updateCategory));
    await refreshCategories();
    setAdminNotice({
      type: "success",
      message: "Orden de categorias actualizado.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo ordenar la categoria: ${error.message}`
          : "No se pudo ordenar la categoria.",
    });
  } finally {
    setIsSavingCategory(false);
  }
};

const deleteStoreCategory = async (
  nextCategory: StoreCategory & { id: number }
) => {
  if (
    products.some(
      (product) => product.category === nextCategory.value
    )
  ) {
    setAdminNotice({
      type: "error",
      message:
        "No se puede eliminar una categoria con productos asociados.",
    });
    return;
  }

  setIsSavingCategory(true);
  setAdminNotice(null);

  try {
    await deleteCategory(nextCategory.id);
    await refreshCategories();
    setAdminNotice({
      type: "success",
      message: "Categoria eliminada.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo eliminar la categoria: ${error.message}`
          : "No se pudo eliminar la categoria.",
    });
  } finally {
    setIsSavingCategory(false);
  }
};

const saveHomeContent = async (nextHomeContent: HomeContent) => {
  setIsSavingHomeContent(true);
  setAdminNotice(null);

  try {
    await updateHomeContent(nextHomeContent);
    await refreshHomeContent();
    setAdminNotice({
      type: "success",
      message: "Home actualizado.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo actualizar Home: ${error.message}`
          : "No se pudo actualizar Home.",
    });
  } finally {
    setIsSavingHomeContent(false);
  }
};

const uploadHomeImages = async (files: File[]) => {
  setIsUploadingHomeImage(true);
  setAdminNotice(null);

  try {
    const urls: string[] = [];

    for (const file of files) {
      urls.push(await uploadHomeImage(file));
    }

    setAdminNotice({
      type: "success",
      message: "Imagenes subidas.",
    });

    return urls;
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron subir las imagenes.",
    });

    return [];
  } finally {
    setIsUploadingHomeImage(false);
  }
};





const deleteProduct = async (id: number) => {
  if (savingProductAction) return;

  const shouldDelete = window.confirm(
    "Seguro que queres eliminar este producto?"
  );

  if (!shouldDelete) return;

  setSavingProductAction({
    id,
    action: "delete",
  });

  try {
    await deleteAdminProduct(id);

    setProducts((prev) =>
      prev.filter((product) => product.id !== id)
    );

    setAdminNotice({
      type: "success",
      message: "Producto eliminado.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo eliminar el producto: ${error.message}`
          : "No se pudo eliminar el producto.",
    });
  } finally {
    setSavingProductAction(null);
  }

};

const toggleFeaturedProduct = async (product: Product) => {
  if (savingProductAction) return;

  setSavingProductAction({
    id: product.id,
    action: "featured",
  });

  try {
    await updateAdminProductFeatured(product);

  await refreshProducts();
  setAdminNotice({
    type: "success",
    message: product.featured
      ? "Producto quitado de destacados."
      : "Producto marcado como destacado.",
  });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo actualizar destacado: ${error.message}`
          : "No se pudo actualizar destacado.",
    });
  } finally {
    setSavingProductAction(null);
  }
};

const toggleActiveProduct = async (product: Product) => {
  if (savingProductAction) return;

  setSavingProductAction({
    id: product.id,
    action: "active",
  });

  try {
    await updateAdminProductActive(product);

    await refreshProducts();
    setAdminNotice({
      type: "success",
      message: product.active
        ? "Producto ocultado de la tienda."
        : "Producto publicado en la tienda.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? `No se pudo actualizar publicacion: ${error.message}`
          : "No se pudo actualizar publicacion.",
    });
  } finally {
    setSavingProductAction(null);
  }
};

const startEditingProduct = (product: Product) => {
  setProductFormError("");
  setAdminNotice(null);
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
    if (isUpdatingProduct) return;

    setProductFormError("");
    setAdminNotice(null);

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

    setIsUpdatingProduct(true);

    try {
      await updateAdminProduct({
        product: editingProduct,
        slug: nextSlug,
        detailsText: editingDetailsText,
      });

    await refreshProducts();
    setEditingProduct(null);

    setAdminNotice({
      type: "success",
      message: "Producto actualizado.",
    });
    } catch (error) {
      setProductFormError(
        error && typeof error === "object"
          ? getProductMutationError(error)
          : "No se pudo guardar el producto."
      );
    } finally {
      setIsUpdatingProduct(false);
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
  const previousStatus = order.status;

  try {
    await updateOrderStatus(order, status);
    await Promise.all([
      refreshOrders(),
      refreshProducts(),
    ]);
    setAdminNotice({
      type: "success",
      message: `Pedido ${formatOrderNumber(order.orderNumber)}: ${orderStatusLabels[previousStatus]} -> ${orderStatusLabels[status]}.`,
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el pedido.",
    });
  }
};

const handleDeleteOrder = async (order: AdminOrder) => {
  try {
    await deleteOrder(order);
    await Promise.all([
      refreshOrders(),
      refreshProducts(),
    ]);
    setAdminNotice({
      type: "success",
      message: `Pedido ${formatOrderNumber(order.orderNumber)} eliminado.`,
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el pedido.",
    });
  }
};

const handleDeleteOrders = async (selectedOrders: AdminOrder[]) => {
  try {
    for (const order of selectedOrders) {
      await deleteOrder(order);
    }

    await Promise.all([
      refreshOrders(),
      refreshProducts(),
    ]);
    setAdminNotice({
      type: "success",
      message: `${selectedOrders.length} pedidos eliminados.`,
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar los pedidos.",
    });
  }
};

const handleUpdateOrderInternalNotes = async (
  orderId: string,
  internalNotes: string
) => {
  try {
    await updateOrderInternalNotes(orderId, internalNotes);
    await refreshOrders();
    setAdminNotice({
      type: "success",
      message: "Nota interna guardada.",
    });
  } catch (error) {
    setAdminNotice({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo guardar la nota interna.",
    });
  }
};

if (isAuthLoading) {
  return (
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-10 md:px-10 flex items-center justify-center">
      <p className="text-zinc-400">
        Cargando admin...
      </p>
    </main>
  );
}

if (!session) {
  return (
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-10 flex items-center justify-center">
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
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-8 md:px-10">

      <div className="relative mb-10 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-5xl font-bold">
            Admin
          </h1>

          <p className="text-zinc-500 mt-2">
            {session.user.email}
          </p>
        </div>

        <Link
          href="/"
          className="absolute left-1/2 top-1 -translate-x-1/2 text-2xl font-bold tracking-[0.35em] text-white transition hover:opacity-75 max-md:hidden"
        >
          AIVLIS
        </Link>

        <button
          onClick={handleLogout}
          className="shrink-0 bg-zinc-800 text-white px-5 h-11 rounded-xl font-semibold hover:bg-zinc-700 transition cursor-pointer"
        >
          Salir
        </button>
      </div>

      <div className="mb-8 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex w-full flex-wrap rounded-2xl bg-zinc-900 p-1 md:w-fit">
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

          <button
            type="button"
            onClick={() => setActiveSection("home")}
            className={`h-11 flex-1 rounded-xl px-5 font-semibold transition cursor-pointer md:flex-none ${
              activeSection === "home"
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Home
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection("local_sale")}
          className={`h-12 w-full rounded-2xl border px-6 font-semibold transition cursor-pointer md:w-fit ${
            activeSection === "local_sale"
              ? "border-emerald-400 bg-emerald-400 text-black"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          Venta local
        </button>
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
    categories={categoryOptions.filter(
      (categoryOption) => categoryOption.active
    )}
    description={description}
    setDescription={setDescription}
    detailsText={detailsText}
    setDetailsText={setDetailsText}
    variants={variants}
    setVariants={setVariants}
    selectedVariantIndex={selectedVariantIndex}
    setSelectedVariantIndex={setSelectedVariantIndex}
    isSaving={isCreatingProduct}
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
    categories={categoryOptions.filter(
      (categoryOption) =>
        categoryOption.active ||
        categoryOption.value === editingProduct.category
    )}
    editingVariantIndex={editingVariantIndex}
    setEditingVariantIndex={setEditingVariantIndex}
    isSaving={isUpdatingProduct}
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
    onUpdateInternalNotes={handleUpdateOrderInternalNotes}
    onDelete={handleDeleteOrder}
    onDeleteMany={handleDeleteOrders}
  />
)}
{activeSection === "products" && (
  <AdminProductsSection
    products={products}
    categories={categoryOptions}
    savingProductAction={savingProductAction}
    onToggleFeatured={toggleFeaturedProduct}
    onToggleActive={toggleActiveProduct}
    onDelete={deleteProduct}
    onEdit={startEditingProduct}
    onCreateProduct={() => {
      setProductFormError("");
      setAdminNotice(null);
      setShowCreate(true);
    }}
  />
)}
{activeSection === "local_sale" && (
  <AdminLocalSaleSection />
)}
{activeSection === "home" && (
  <>
    <AdminHomeSection
      key={JSON.stringify(homeContent)}
      content={homeContent}
      error={homeContentError}
      isSaving={isSavingHomeContent}
      isUploading={isUploadingHomeImage}
      onSave={saveHomeContent}
      onUploadHeroImages={uploadHomeImages}
    />

    <AdminCategoriesSection
      categories={categoryOptions}
      products={products}
      error={categoryError}
      isSaving={isSavingCategory}
      onCreate={createStoreCategory}
      onUpdate={updateStoreCategory}
      onMove={moveStoreCategory}
      onNormalizeOrder={normalizeStoreCategoriesOrder}
      onDelete={deleteStoreCategory}
    />
  </>
)}

{adminNotice && (
  <div
    style={{
      backgroundColor:
        adminNotice.type === "success" ? "#16a34a" : "#dc2626",
      borderColor:
        adminNotice.type === "success" ? "#86efac" : "#fca5a5",
      color: "#ffffff",
    }}
    className="fixed left-1/2 top-24 z-[9999] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start justify-between gap-4 rounded-2xl border p-4 text-sm font-semibold shadow-2xl"
  >
    <span>{adminNotice.message}</span>

    <button
      type="button"
      onClick={() => setAdminNotice(null)}
      className="shrink-0 text-xs font-semibold uppercase tracking-wide opacity-80 transition hover:opacity-100"
    >
      Cerrar
    </button>
  </div>
)}
    </main>
  );
}


