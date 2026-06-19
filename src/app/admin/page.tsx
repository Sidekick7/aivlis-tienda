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
import AdminCategoriesSection from "@/app/admin/AdminCategoriesSection";
import AdminHomeSection from "@/app/admin/AdminHomeSection";
import AdminProductsSection from "@/app/admin/AdminProductsSection";
import CreateProductModal from "@/app/admin/CreateProductModal";
import EditProductModal from "@/app/admin/EditProductModal";
import {
  createEmptyProductVariant,
  formatDetailsText,
  formatSku,
  getNextSku,
  getSkuCode,
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
import type { Session } from "@supabase/supabase-js";

type AdminNotice = {
  type: "success" | "error";
  message: string;
};

type SavingProductAction = {
  id: number;
  action: "featured" | "active" | "delete";
};

export default function AdminPage() {

const [session, setSession] = useState<Session | null>(null);
const [isAuthLoading, setIsAuthLoading] = useState(true);
const [isAdminAllowed, setIsAdminAllowed] = useState(false);
const [isAdminCheckLoading, setIsAdminCheckLoading] = useState(false);
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authMessage, setAuthMessage] = useState("");
const [isSendingLogin, setIsSendingLogin] = useState(false);
const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
const [activeSection, setActiveSection] =
  useState<AdminSection>("products");
const [showCreate, setShowCreate] = useState(false);
const [productFormError, setProductFormError] = useState("");
const [name, setName] = useState("");
const [slug, setSlug] = useState("");
const [skuCode, setSkuCode] = useState("");
const [isSlugEdited, setIsSlugEdited] = useState(false);
const [price, setPrice] = useState("");
const [retailPrice, setRetailPrice] = useState("");
const [cost, setCost] = useState("");
const [saleMode, setSaleMode] = useState<Product["saleMode"]>("unit");
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

useEffect(() => {
  let isCurrent = true;

  const checkAdminAccess = async () => {
    if (!session) {
      setIsAdminAllowed(false);
      setIsAdminCheckLoading(false);
      return;
    }

    setIsAdminAllowed(false);
    setIsAdminCheckLoading(true);

    const email = session.user.email;

    if (!email) {
      await supabase.auth.signOut();

      if (isCurrent) {
        setSession(null);
        setAuthMessage("Tu usuario no tiene email asociado.");
        setIsAdminCheckLoading(false);
      }

      return;
    }

    const { data, error } = await supabase.rpc("is_admin");

    if (!isCurrent) return;

    if (error || data !== true) {
      await supabase.auth.signOut();

      if (!isCurrent) return;

      setSession(null);
      setProducts([]);
      setAuthMessage("Este usuario no tiene permisos de administrador.");
      setIsAdminAllowed(false);
      setIsAdminCheckLoading(false);
      return;
    }

    setIsAdminAllowed(true);
    setIsAdminCheckLoading(false);
  };

  void checkAdminAccess();

  return () => {
    isCurrent = false;
  };
}, [session]);

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

  if (!session || !isAdminAllowed) return;

  getProducts({
    includeInactive: true,
  }).then(setProducts);
  Promise.resolve().then(refreshCategories);
  Promise.resolve().then(refreshHomeContent);

}, [session, isAdminAllowed]);

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
  const nextSkuCode = skuCode || getSkuCode(getNextSku(products));
  const validationError = getProductFormError({
    productName: name,
    productSlug: nextSlug,
    productSku: nextSkuCode,
    productPrice: price,
    productRetailPrice: retailPrice,
    productCost: cost,
    productCategory: category,
    productVariants: variants,
    productSaleMode: saleMode,
  });

  if (validationError) {
    setProductFormError(validationError);
    return;
  }

  if (products.some((product) => product.slug === nextSlug)) {
    setProductFormError("Ya existe un producto con ese slug.");
    return;
  }

  if (
    products.some(
      (product) => getSkuCode(product.sku) === nextSkuCode
    )
  ) {
    setProductFormError("Ya existe un producto con ese SKU.");
    return;
  }

  setIsCreatingProduct(true);

  try {
    await createAdminProduct({
      name,
      slug: nextSlug,
      sku: formatSku(nextSkuCode),
      price,
      retailPrice,
      cost,
      category,
      description,
      detailsText,
      variants,
      saleMode,
    });

    await refreshProducts();

    setShowCreate(false);

    setName("");
    setSlug("");
    setSkuCode("");
    setIsSlugEdited(false);
    setPrice("");
    setRetailPrice("");
    setCost("");
    setSaleMode("unit");
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





const deleteProduct = async (product: Product) => {
  if (savingProductAction) return;

  const shouldDelete = window.confirm(
    `Seguro que queres eliminar "${product.name}"?`
  );

  if (!shouldDelete) return;

  setSavingProductAction({
    id: product.id,
    action: "delete",
  });

  try {
    await deleteAdminProduct(product.id);

    setProducts((prev) =>
      prev.filter((currentProduct) => currentProduct.id !== product.id)
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
      productSku: getSkuCode(editingProduct.sku),
      productPrice: editingProduct.price,
      productRetailPrice: editingProduct.retailPrice,
      productCost: editingProduct.cost,
      productCategory: editingProduct.category,
      productVariants: editingProduct.variants,
      productSaleMode: editingProduct.saleMode,
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

    if (
      products.some(
        (product) =>
          getSkuCode(product.sku) === getSkuCode(editingProduct.sku) &&
          product.id !== editingProduct.id
      )
    ) {
      setProductFormError("Ya existe un producto con ese SKU.");
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
  setShowLogoutConfirm(false);
  await supabase.auth.signOut();
  setSession(null);
  setProducts([]);
};

if (isAuthLoading || isAdminCheckLoading) {
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
    <main className="min-h-screen bg-black text-white px-6 pb-10 pt-4 md:px-10">

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="flex w-full flex-wrap rounded-2xl bg-zinc-900 p-1 lg:w-fit">
          <button
            type="button"
            onClick={() => setActiveSection("products")}
            className={`h-10 flex-1 rounded-xl px-4 text-sm font-semibold transition cursor-pointer md:flex-none ${
              activeSection === "products"
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Productos ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("home")}
            className={`h-10 flex-1 rounded-xl px-4 text-sm font-semibold transition cursor-pointer md:flex-none ${
              activeSection === "home"
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Home
          </button>
        </div>

        <Link
          href="/"
          className="justify-self-center text-xl font-bold tracking-[0.35em] text-white transition hover:opacity-75"
        >
          AIVLIS
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/gestion"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10 px-5 text-sm font-semibold text-sky-300 transition hover:border-sky-300 hover:bg-sky-500/20"
          >
            Gestion
          </Link>

          <div className="hidden h-8 w-px bg-zinc-800 sm:block" />

          <div className="relative">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title={session.user.email}
              className="h-10 rounded-2xl bg-zinc-800 px-5 text-sm font-semibold text-white transition hover:bg-zinc-700 cursor-pointer"
            >
              Salir
            </button>

            {showLogoutConfirm && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
                <p className="text-sm font-semibold text-white">
                  Cerrar sesion del admin?
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Vas a tener que volver a entrar para administrar la tienda.
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="h-10 flex-1 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="h-10 flex-1 rounded-xl bg-white text-sm font-semibold text-black transition hover:opacity-90 cursor-pointer"
                  >
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

{showCreate && (
  <CreateProductModal
    productFormError={productFormError}
    name={name}
    setName={setName}
    slug={slug}
    setSlug={setSlug}
    skuCode={skuCode}
    setSkuCode={setSkuCode}
    isSlugEdited={isSlugEdited}
    setIsSlugEdited={setIsSlugEdited}
    price={price}
    setPrice={setPrice}
    retailPrice={retailPrice}
    setRetailPrice={setRetailPrice}
    cost={cost}
    setCost={setCost}
    saleMode={saleMode}
    setSaleMode={setSaleMode}
    category={category}
    setCategory={setCategory}
    categories={categoryOptions.filter(
      (categoryOption) => categoryOption.active
    )}
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


