"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Images,
  LogOut,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  formatSku,
  getNextSku,
  getSkuCode,
  normalizeSkuCode,
  slugifyProductName,
} from "@/app/admin/adminUtils";
import {
  getCategories,
  getFallbackCategories,
} from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import type { StoreCategory } from "@/types/category";
import type { Product } from "@/types/product";
import type { Session } from "@supabase/supabase-js";

type InventoryTab =
  | "all"
  | "low"
  | "out"
  | "critical"
  | "inactive";
type InventorySort = "stock_asc" | "stock_desc" | "newest" | "sku" | "category";
type QuickProductDraft = {
  name: string;
  skuCode: string;
  category: string;
  cost: string;
  price: string;
  retailPrice: string;
  colors: Array<{
    color: string;
    hex: string;
    sizes: Array<{
      size: string;
      stock: string;
    }>;
  }>;
};

const lowStockLimit = 2;

const navItems = [
  {
    title: "Punto de venta",
    href: "/gestion/puntoventa",
    icon: ShoppingBag,
    featured: true,
  },
  {
    title: "Ventas",
    href: "/gestion/ventas",
    icon: ClipboardList,
  },
  {
    title: "Envios",
    href: "/gestion",
    icon: Truck,
  },
  {
    title: "Inventario",
    href: "/gestion/inventario",
    icon: Boxes,
    active: true,
  },
  {
    title: "Caja",
    href: "/gestion",
    icon: CreditCard,
  },
  {
    title: "Estadisticas",
    href: "/gestion/estadisticas",
    icon: BarChart3,
  },
  {
    title: "Catalogo",
    href: "/gestion/catalogo",
    icon: Images,
  },
];

const inventoryTabs: Array<{
  label: string;
  value: InventoryTab;
}> = [
  { label: "Todos", value: "all" },
  { label: "Bajo stock", value: "low" },
  { label: "Sin stock", value: "out" },
  { label: "Critico", value: "critical" },
  { label: "Inactivos", value: "inactive" },
];

const sortOptions: Array<{
  label: string;
  value: InventorySort;
}> = [
  { label: "Menor stock", value: "stock_asc" },
  { label: "Mayor stock", value: "stock_desc" },
  { label: "Mas nuevo", value: "newest" },
  { label: "SKU", value: "sku" },
  { label: "Categoria", value: "category" },
];

function getShortSku(sku?: string | null) {
  return sku?.startsWith("AIV-") ? sku.slice(4) : sku || "-";
}

function formatInventoryPriceInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  return formatPrice(Number(digits));
}

function parseInventoryPriceInput(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits ? Number(digits) : Number.NaN;
}

function getProductStock(product: Product) {
  return product.variants.reduce(
    (total, variant) =>
      total + variant.sizes.reduce((sum, size) => sum + size.stock, 0),
    0
  );
}

function getLowStockEntries(product: Product) {
  return product.variants.flatMap((variant) =>
    variant.sizes
      .filter((size) => size.stock > 0 && size.stock <= lowStockLimit)
      .map((size) => ({
        color: variant.color,
        size: size.size,
        stock: size.stock,
      }))
  );
}

function getCriticalStockEntries(product: Product) {
  return product.variants.flatMap((variant) =>
    variant.sizes
      .filter((size) => size.stock <= lowStockLimit)
      .map((size) => ({
        product,
        color: variant.color,
        size: size.size,
        stock: size.stock,
      }))
  );
}

export default function GestionInventarioPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] =
    useState<StoreCategory[]>(getFallbackCategories());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [activeTab, setActiveTab] = useState<InventoryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState<InventorySort>("newest");
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null
  );
  const [priceEditor, setPriceEditor] = useState<{
    product: Product;
    cost: string;
    price: string;
    retailPrice: string;
  } | null>(null);
  const [stockEditor, setStockEditor] = useState<{
    product: Product;
    variants: Array<{
      color: string;
      sizes: Array<{
        size: string;
        stock: string;
      }>;
    }>;
  } | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isSavingQuickProduct, setIsSavingQuickProduct] =
    useState(false);
  const [savingActiveProductId, setSavingActiveProductId] = useState<
    number | null
  >(null);
  const [inventoryNotice, setInventoryNotice] = useState("");
  const [quickProductDraft, setQuickProductDraft] =
    useState<QuickProductDraft | null>(null);
  const [selectedQuickColorIndex, setSelectedQuickColorIndex] =
    useState(0);

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

    const checkAccess = async () => {
      if (!session) {
        setIsAllowed(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsAllowed(false);
      setIsCheckingAccess(true);

      const { data, error } = await supabase.rpc("is_admin");

      if (!isCurrent) return;

      if (error || data !== true) {
        await supabase.auth.signOut();

        if (!isCurrent) return;

        setSession(null);
        setAuthMessage("Este usuario no tiene permisos para Gestion.");
        setIsAllowed(false);
        setIsCheckingAccess(false);
        return;
      }

      setIsAllowed(true);
      setIsCheckingAccess(false);
    };

    void checkAccess();

    return () => {
      isCurrent = false;
    };
  }, [session]);

  const refreshProducts = async () => {
    setIsLoadingProducts(true);
    setInventoryError("");

    try {
      const [nextProducts, nextCategories] = await Promise.all([
        getProducts({
          includeInactive: true,
        }),
        getCategories({
          includeInactive: false,
          fallbackToStatic: true,
        }),
      ]);

      setProducts(nextProducts);
      setCategoryOptions(nextCategories);
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el inventario."
      );
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!session || !isAllowed) return;

    queueMicrotask(() => {
      void refreshProducts();
    });
  }, [session, isAllowed]);

  useEffect(() => {
    if (!inventoryNotice) return;

    const timeout = window.setTimeout(() => {
      setInventoryNotice("");
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [inventoryNotice]);

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
    setProducts([]);
  };

  const openPriceEditor = (product: Product) => {
    setInventoryError("");
    setInventoryNotice("");
    setPriceEditor({
      product,
      cost: formatInventoryPriceInput(product.cost),
      price: formatInventoryPriceInput(product.price),
      retailPrice: formatInventoryPriceInput(product.retailPrice),
    });
  };

  const openStockEditor = (product: Product) => {
    setInventoryError("");
    setInventoryNotice("");
    setStockEditor({
      product,
      variants: product.variants.map((variant) => ({
        color: variant.color,
        sizes: variant.sizes.map((size) => ({
          size: size.size,
          stock: String(size.stock),
        })),
      })),
    });
  };

  const openQuickProductCreator = () => {
    const nextSkuCode = getSkuCode(getNextSku(products));

    setInventoryError("");
    setInventoryNotice("");
    setSelectedQuickColorIndex(0);
    setQuickProductDraft({
      name: "",
      skuCode: nextSkuCode,
      category: categoryOptions[0]?.value || "",
      cost: "",
      price: "",
      retailPrice: "",
      colors: [
        {
          color: "",
          hex: "#000000",
          sizes: [
            {
              size: "",
              stock: "",
            },
          ],
        },
      ],
    });
  };

  const handleSavePrices = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!priceEditor || isSavingPrice) return;

    const nextPrice = parseInventoryPriceInput(priceEditor.price);
    const nextRetailPrice = parseInventoryPriceInput(priceEditor.retailPrice);
    const nextCost = parseInventoryPriceInput(priceEditor.cost);

    if (
      !Number.isFinite(nextCost) ||
      !Number.isFinite(nextPrice) ||
      !Number.isFinite(nextRetailPrice) ||
      nextCost < 0 ||
      nextPrice < 0 ||
      nextRetailPrice < 0
    ) {
      setInventoryError("Costo y precios tienen que ser numeros validos.");
      return;
    }

    if (nextRetailPrice < nextPrice) {
      setInventoryError("El precio minorista no puede ser menor al precio web.");
      return;
    }

    setIsSavingPrice(true);
    setInventoryError("");

    try {
      const { error } = await supabase
        .from("products")
        .update({
          cost: nextCost,
          price: nextPrice,
          retail_price: nextRetailPrice,
        })
        .eq("id", priceEditor.product.id);

      if (error) {
        throw error;
      }

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === priceEditor.product.id
            ? {
              ...product,
                cost: nextCost,
                price: nextPrice,
                retailPrice: nextRetailPrice,
              }
            : product
        )
      );
      setInventoryNotice(`Precios de ${priceEditor.product.name} actualizados.`);
      setPriceEditor(null);
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los precios."
      );
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (savingActiveProductId) return;

    const nextActive = !product.active;

    setSavingActiveProductId(product.id);
    setInventoryError("");

    try {
      const { error } = await supabase
        .from("products")
        .update({
          active: nextActive,
        })
        .eq("id", product.id);

      if (error) {
        throw error;
      }

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id
            ? {
                ...currentProduct,
                active: nextActive,
              }
            : currentProduct
        )
      );
      setInventoryNotice(
        `${product.name}: ${nextActive ? "publicado" : "oculto"}.`
      );
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del producto."
      );
    } finally {
      setSavingActiveProductId(null);
    }
  };

  const handleSaveStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stockEditor || isSavingStock) return;

    setIsSavingStock(true);
    setInventoryError("");

    try {
      const nextVariants = stockEditor.product.variants.map(
        (variant, variantIndex) => {
          const draftVariant = stockEditor.variants[variantIndex];
          const nextSizes = variant.sizes.map((size, sizeIndex) => {
            const nextStock = Number(
              draftVariant?.sizes[sizeIndex]?.stock ?? size.stock
            );

            if (
              !Number.isFinite(nextStock) ||
              nextStock < 0 ||
              !Number.isInteger(nextStock)
            ) {
              throw new Error(
                "El stock tiene que ser un numero entero positivo."
              );
            }

            return {
              ...size,
              stock: nextStock,
            };
          });

          return {
            ...variant,
            sizes: nextSizes,
            stock: nextSizes.reduce((total, size) => total + size.stock, 0),
            images: [...variant.images],
          };
        }
      );
      const nextTotalStock = nextVariants.reduce(
        (total, variant) => total + (variant.stock ?? 0),
        0
      );

      const { error } = await supabase
        .from("products")
        .update({
          variants: nextVariants,
          stock: nextTotalStock,
        })
        .eq("id", stockEditor.product.id);

      if (error) {
        throw error;
      }

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === stockEditor.product.id
            ? {
                ...product,
                variants: nextVariants,
                stock: nextTotalStock,
              }
            : product
        )
      );
      setInventoryNotice(`${stockEditor.product.name}: stock actualizado.`);
      setStockEditor(null);
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el stock."
      );
    } finally {
      setIsSavingStock(false);
    }
  };

  const handleCreateQuickProduct = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!quickProductDraft || isSavingQuickProduct) return;

    const name = quickProductDraft.name.trim();
    const slug = slugifyProductName(name);
    const skuCode = normalizeSkuCode(quickProductDraft.skuCode);
    const category = quickProductDraft.category.trim();
    const cost = parseInventoryPriceInput(quickProductDraft.cost);
    const price = parseInventoryPriceInput(quickProductDraft.price);
    const retailPrice = parseInventoryPriceInput(
      quickProductDraft.retailPrice || quickProductDraft.price
    );
    const draftColors = quickProductDraft.colors.map((colorItem) => ({
      color: colorItem.color.trim(),
      hex: colorItem.hex || "#000000",
      sizes: colorItem.sizes.map((size) => ({
        size: size.size.trim(),
        stock: Number(size.stock),
      })),
    }));

    if (!name) {
      setInventoryError("El nombre del producto es obligatorio.");
      return;
    }

    if (!slug) {
      setInventoryError("No se pudo generar un slug valido.");
      return;
    }

    if (!/^[A-Z0-9-]{3,6}$/.test(skuCode)) {
      setInventoryError("El SKU debe tener entre 3 y 6 caracteres.");
      return;
    }

    if (products.some((product) => product.slug === slug)) {
      setInventoryError("Ya existe un producto con ese nombre/slug.");
      return;
    }

    if (products.some((product) => getSkuCode(product.sku) === skuCode)) {
      setInventoryError("Ya existe un producto con ese SKU.");
      return;
    }

    if (!category) {
      setInventoryError("La categoria es obligatoria.");
      return;
    }

    if (
      !Number.isFinite(cost) ||
      !Number.isFinite(price) ||
      !Number.isFinite(retailPrice) ||
      cost < 0 ||
      price <= 0 ||
      retailPrice <= 0
    ) {
      setInventoryError("Costo y precios tienen que ser numeros validos.");
      return;
    }

    if (retailPrice < price) {
      setInventoryError("El precio minorista no puede ser menor al precio web.");
      return;
    }

    if (draftColors.length === 0) {
      setInventoryError("Agrega al menos un color.");
      return;
    }

    if (
      draftColors.some(
        (colorItem) =>
          !colorItem.color ||
          colorItem.sizes.length === 0 ||
          colorItem.sizes.some(
            (size) =>
              !size.size ||
              !Number.isInteger(size.stock) ||
              size.stock < 0
          )
      )
    ) {
      setInventoryError(
        "Completa cada color con talles y stock de 0 o mas."
      );
      return;
    }

    const variants = draftColors.map((colorItem) => ({
      color: colorItem.color,
      hex: colorItem.hex,
      stock: colorItem.sizes.reduce(
        (total, size) => total + size.stock,
        0
      ),
      sizes: colorItem.sizes,
      images: [],
    }));
    const stock = variants.reduce(
      (total, variant) => total + variant.stock,
      0
    );

    setIsSavingQuickProduct(true);
    setInventoryError("");

    try {
      const { error } = await supabase.from("products").insert([
        {
          name,
          slug,
          sku: formatSku(skuCode),
          price,
          retail_price: retailPrice,
          cost,
          sale_mode: "unit",
          category,
          description: "",
          details: [],
          stock,
          featured: false,
          active: false,
          variants,
          images: [],
        },
      ]);

      if (error) {
        throw error;
      }

      await refreshProducts();
      setQuickProductDraft(null);
      setSelectedQuickColorIndex(0);
      setActiveTab("inactive");
      setSortMode("newest");
      setInventoryNotice(
        `${name} creado oculto. Completa fotos en Admin antes de publicarlo.`
      );
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el producto."
      );
    } finally {
      setIsSavingQuickProduct(false);
    }
  };

  const updateQuickColor = (
    colorIndex: number,
    updates: Partial<QuickProductDraft["colors"][number]>
  ) => {
    setQuickProductDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            colors: currentDraft.colors.map((currentColor, currentIndex) =>
              currentIndex === colorIndex
                ? {
                    ...currentColor,
                    ...updates,
                  }
                : currentColor
            ),
          }
        : currentDraft
    );
  };

  const updateQuickSize = (
    colorIndex: number,
    sizeIndex: number,
    updates: Partial<QuickProductDraft["colors"][number]["sizes"][number]>
  ) => {
    setQuickProductDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            colors: currentDraft.colors.map((currentColor, currentIndex) =>
              currentIndex === colorIndex
                ? {
                    ...currentColor,
                    sizes: currentColor.sizes.map(
                      (currentSize, currentSizeIndex) =>
                        currentSizeIndex === sizeIndex
                          ? {
                              ...currentSize,
                              ...updates,
                            }
                          : currentSize
                    ),
                  }
                : currentColor
            ),
          }
        : currentDraft
    );
  };

  const addQuickColor = () => {
    setQuickProductDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;

      const nextColorIndex = currentDraft.colors.length;

      setSelectedQuickColorIndex(nextColorIndex);

      return {
        ...currentDraft,
        colors: [
          ...currentDraft.colors,
          {
                                      color: "",
            hex: "#000000",
            sizes: [
              {
                size: "",
                stock: "",
              },
            ],
          },
        ],
      };
    });
  };

  const removeQuickColor = (colorIndex: number) => {
    setQuickProductDraft((currentDraft) => {
      if (!currentDraft || currentDraft.colors.length === 1) {
        return currentDraft;
      }

      const nextColors = currentDraft.colors.filter(
        (_, currentIndex) => currentIndex !== colorIndex
      );

      setSelectedQuickColorIndex((currentIndex) =>
        Math.min(
          currentIndex > colorIndex ? currentIndex - 1 : currentIndex,
          nextColors.length - 1
        )
      );

      return {
        ...currentDraft,
        colors: nextColors,
      };
    });
  };

  const addQuickSize = (colorIndex: number) => {
    setQuickProductDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            colors: currentDraft.colors.map((currentColor, currentIndex) =>
              currentIndex === colorIndex
                ? {
                    ...currentColor,
                    sizes: [
                      ...currentColor.sizes,
                      {
                        size: "",
                        stock: "",
                      },
                    ],
                  }
                : currentColor
            ),
          }
        : currentDraft
    );
  };

  const removeQuickSize = (colorIndex: number, sizeIndex: number) => {
    setQuickProductDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            colors: currentDraft.colors.map((currentColor, currentIndex) =>
              currentIndex === colorIndex && currentColor.sizes.length > 1
                ? {
                    ...currentColor,
                    sizes: currentColor.sizes.filter(
                      (_, currentSizeIndex) => currentSizeIndex !== sizeIndex
                    ),
                  }
                : currentColor
            ),
          }
        : currentDraft
    );
  };

  const stockSummary = useMemo(() => {
    const activeProducts = products.filter((product) => product.active);
    const stockTotal = activeProducts.reduce(
      (total, product) => total + getProductStock(product),
      0
    );
    const outProducts = activeProducts.filter(
      (product) => getProductStock(product) <= 0
    );
    const lowProducts = activeProducts.filter(
      (product) => getLowStockEntries(product).length > 0
    );
    const totalValue = activeProducts.reduce(
      (total, product) =>
        total +
        getProductStock(product) *
          (product.cost > 0 ? product.cost : product.price),
      0
    );

    return {
      activeProducts,
      stockTotal,
      outProducts,
      lowProducts,
      totalValue,
      inactiveProducts: products.filter((product) => !product.active),
    };
  }, [products]);

  const categories = Array.from(
    new Set(
      products
        .map((product) => product.category.trim())
        .filter(Boolean)
    )
  ).sort((firstCategory, secondCategory) =>
    firstCategory.localeCompare(secondCategory, "es")
  );
  const criticalEntries = products
    .filter((product) => product.active)
    .flatMap(getCriticalStockEntries)
    .filter(({ product }) =>
      categoryFilter === "all" ? true : product.category === categoryFilter
    );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const stock = getProductStock(product);
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "low" &&
        product.active &&
        getLowStockEntries(product).length > 0) ||
      (activeTab === "out" && product.active && stock <= 0) ||
      (activeTab === "inactive" && !product.active);
    const matchesSearch =
      !normalizedSearch ||
      [
        product.name,
        product.sku,
        product.slug,
        product.category,
        ...product.variants.map((variant) => variant.color),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesCategory && matchesTab && matchesSearch;
  });
  const sortedProducts = [...visibleProducts].sort((firstProduct, secondProduct) => {
    if (sortMode === "stock_asc") {
      return getProductStock(firstProduct) - getProductStock(secondProduct);
    }

    if (sortMode === "stock_desc") {
      return getProductStock(secondProduct) - getProductStock(firstProduct);
    }

    if (sortMode === "newest") {
      return secondProduct.id - firstProduct.id;
    }

    if (sortMode === "sku") {
      return getShortSku(firstProduct.sku).localeCompare(
        getShortSku(secondProduct.sku),
        "es"
      );
    }

    return `${firstProduct.category}-${firstProduct.name}`.localeCompare(
      `${secondProduct.category}-${secondProduct.name}`,
      "es"
    );
  });
  const filteredCriticalEntries = criticalEntries
    .filter(({ product, color, size }) => {
      if (!normalizedSearch) return true;

      return [
        product.name,
        product.sku,
        product.slug,
        product.category,
        color,
        size,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((firstEntry, secondEntry) => {
      if (firstEntry.stock !== secondEntry.stock) {
        return firstEntry.stock - secondEntry.stock;
      }

      return firstEntry.product.name.localeCompare(
        secondEntry.product.name,
        "es"
      );
    });

  if (isAuthLoading || isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <p className="text-sm font-semibold text-zinc-400">
          Cargando inventario...
        </p>
      </main>
    );
  }

  if (!session || !isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
            AIVLIS
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Inventario
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entra con las mismas credenciales de Gestion para revisar stock,
            faltantes y productos publicados.
          </p>

          <input
            type="email"
            placeholder="tu@email.com"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            required
            className="mt-8 h-12 w-full rounded-xl bg-zinc-900 px-4 text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
          />

          <input
            type="password"
            placeholder="Contrasena"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            required
            className="mt-4 h-12 w-full rounded-xl bg-zinc-900 px-4 text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
          />

          <button
            type="submit"
            disabled={isSendingLogin}
            className="mt-4 h-12 w-full rounded-xl bg-white font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingLogin ? "Entrando..." : "Entrar a Gestion"}
          </button>

          {authMessage && (
            <p className="mt-4 text-sm text-zinc-400">
              {authMessage}
            </p>
          )}
        </form>
      </main>
    );
  }

  const activeQuickColorIndex = quickProductDraft
    ? Math.min(
        selectedQuickColorIndex,
        quickProductDraft.colors.length - 1
      )
    : 0;
  const activeQuickColor =
    quickProductDraft?.colors[activeQuickColorIndex] ?? null;

  return (
    <main className="h-screen overflow-hidden bg-[#090909] text-white">
      <div className="grid h-full min-h-0 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-800 bg-zinc-950 px-2 py-3 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link
              href="/"
              className="block text-xl font-bold tracking-[0.35em] transition hover:opacity-70"
            >
              AIVLIS
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 lg:hidden"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition lg:w-full ${
                    item.active
                      ? "bg-white text-black"
                      : item.featured
                        ? "bg-emerald-400 text-black hover:bg-emerald-300"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden grid-cols-1 gap-2 lg:grid">
            <Link
              href="/admin"
              className="flex h-11 items-center gap-3 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <Settings size={18} />
              Admin tienda
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-11 items-center gap-3 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden px-3 py-3">
          <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Gestion
              </p>
              <h1 className="text-2xl font-black text-white">
                Inventario
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openQuickProductCreator}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-black transition hover:bg-emerald-300"
              >
                <Plus size={15} />
                Nuevo producto
              </button>

              <Link
                href="/admin"
                className="h-9 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                Editar productos
              </Link>
              <button
                type="button"
                onClick={() => void refreshProducts()}
                disabled={isLoadingProducts}
                className="h-9 rounded-xl bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingProducts ? "Cargando..." : "Actualizar"}
              </button>
            </div>
          </header>

          {inventoryError && (
            <div className="mb-3 shrink-0 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {inventoryError}
            </div>
          )}

          {inventoryNotice && (
            <div className="mb-3 shrink-0 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
              {inventoryNotice}
            </div>
          )}

          <section className="mb-3 grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Productos activos
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {stockSummary.activeProducts.length}
              </p>
            </article>
            <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Unidades
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {stockSummary.stockTotal}
              </p>
            </article>
            <article className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-xs font-semibold uppercase text-yellow-200/70">
                Bajo stock
              </p>
              <p className="mt-2 text-2xl font-black text-yellow-100">
                {stockSummary.lowProducts.length}
              </p>
            </article>
            <article className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-xs font-semibold uppercase text-red-200/70">
                Sin stock
              </p>
              <p className="mt-2 text-2xl font-black text-red-100">
                {stockSummary.outProducts.length}
              </p>
            </article>
            <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Valor inventario
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {formatPrice(stockSummary.totalValue)}
              </p>
            </article>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2 overflow-x-auto">
                {inventoryTabs.map((tab) => {
                  const count =
                    tab.value === "all"
                      ? products.length
                      : tab.value === "low"
                        ? stockSummary.lowProducts.length
                        : tab.value === "out"
                          ? stockSummary.outProducts.length
                          : tab.value === "critical"
                            ? criticalEntries.length
                            : stockSummary.inactiveProducts.length;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.value);
                        setExpandedProductId(null);
                      }}
                      className={`h-9 shrink-0 rounded-xl px-3 text-xs font-bold transition ${
                        activeTab === tab.value
                          ? "bg-white text-black"
                          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {tab.label}
                      <span className="ml-2 opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
                <select
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setExpandedProductId(null);
                  }}
                  className="h-9 rounded-xl bg-zinc-900 px-3 text-sm font-bold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                >
                  <option value="all">Todas las categorias</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(event.target.value as InventorySort)
                  }
                  className="h-9 rounded-xl bg-zinc-900 px-3 text-sm font-bold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="relative block min-w-72 flex-1 lg:max-w-sm">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar SKU, producto, categoria o color"
                    className="h-9 w-full rounded-xl bg-zinc-900 pl-9 pr-3 text-sm font-semibold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                  />
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800">
              {activeTab === "critical" ? (
                <>
                  <div className="grid grid-cols-[76px_minmax(0,1fr)_120px_100px_90px_90px] gap-3 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase text-zinc-500">
                    <span>SKU</span>
                    <span>Producto</span>
                    <span>Categoria</span>
                    <span>Color</span>
                    <span>Talle</span>
                    <span>Stock</span>
                  </div>

                  <div className="h-full overflow-y-auto divide-y divide-zinc-800 pb-12">
                    {filteredCriticalEntries.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-zinc-500">
                        No hay talles criticos para mostrar.
                      </p>
                    ) : (
                      filteredCriticalEntries.map((entry) => (
                        <div
                          key={`${entry.product.id}-${entry.color}-${entry.size}`}
                          className="grid grid-cols-[76px_minmax(0,1fr)_120px_100px_90px_90px] items-center gap-3 px-3 py-2 text-sm"
                        >
                          <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300">
                            {getShortSku(entry.product.sku)}
                          </span>
                          <span className="truncate font-bold text-white">
                            {entry.product.name}
                          </span>
                          <span className="truncate text-xs font-semibold text-zinc-400">
                            {entry.product.category || "-"}
                          </span>
                          <span className="truncate text-xs font-bold text-zinc-200">
                            {entry.color}
                          </span>
                          <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-black text-zinc-200">
                            {entry.size}
                          </span>
                          <span
                            className={`w-fit rounded-lg px-2 py-1 text-xs font-black ${
                              entry.stock <= 0
                                ? "bg-red-500/15 text-red-200"
                                : "bg-yellow-500/15 text-yellow-200"
                            }`}
                          >
                            {entry.stock}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-[76px_minmax(0,1fr)_100px_64px_100px_108px_108px_104px_124px] gap-3 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase text-zinc-500">
                    <span>SKU</span>
                    <span>Producto</span>
                    <span>Categoria</span>
                    <span>Stock</span>
                    <span>Costo</span>
                    <span>Web</span>
                    <span>Minorista</span>
                    <span>Estado</span>
                    <span>Acciones</span>
                  </div>

                  <div className="h-full overflow-y-auto divide-y divide-zinc-800 pb-12">
                    {sortedProducts.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-zinc-500">
                        No hay productos para mostrar.
                      </p>
                    ) : (
                      sortedProducts.map((product) => {
                    const stock = getProductStock(product);

                    return (
                      <article key={product.id} className="px-3 py-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setExpandedProductId((currentId) =>
                              currentId === product.id ? null : product.id
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setExpandedProductId((currentId) =>
                                currentId === product.id ? null : product.id
                              );
                            }
                          }}
                          className="grid cursor-pointer grid-cols-[76px_minmax(0,1fr)_100px_64px_100px_108px_108px_104px_124px] items-center gap-3 rounded-xl px-2 py-1 text-sm transition hover:bg-zinc-900"
                        >
                          <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300">
                            {getShortSku(product.sku)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">
                              {product.name}
                            </p>
                            <p className="text-xs font-semibold text-zinc-500">
                              {product.variants.length} colores
                            </p>
                          </div>
                          <span className="truncate text-xs font-semibold text-zinc-400">
                            {product.category || "-"}
                          </span>
                          <span className="font-black text-white">
                            {stock}
                          </span>
                          <span className="font-black text-zinc-300">
                            {product.cost > 0 ? formatPrice(product.cost) : "-"}
                          </span>
                          <span className="font-black text-white">
                            {formatPrice(product.price)}
                          </span>
                          <span className="font-black text-zinc-200">
                            {formatPrice(product.retailPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleToggleActive(product);
                            }}
                            disabled={savingActiveProductId === product.id}
                            className={`w-fit cursor-pointer rounded-full px-3 py-1 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              product.active
                                ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            }`}
                          >
                            {savingActiveProductId === product.id
                              ? "..."
                              : product.active
                                ? "Publicado"
                                : "Oculto"}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openStockEditor(product);
                              }}
                              className="h-8 rounded-xl bg-zinc-800 px-3 text-xs font-black text-zinc-200 transition hover:bg-zinc-700"
                            >
                              Stock
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openPriceEditor(product);
                              }}
                              className="h-8 rounded-xl bg-zinc-800 px-3 text-xs font-black text-zinc-200 transition hover:bg-zinc-700"
                            >
                              Precio
                            </button>
                          </div>
                        </div>

                        {expandedProductId === product.id && (
                          <div className="mt-2 border-t border-zinc-800 px-2 pb-1 pt-1.5">
                            <div className="grid gap-1.5">
                            {product.variants.map((variant) => {
                              const hasVariantStock = variant.sizes.some(
                                (size) => size.stock > 0
                              );

                              return (
                                <div
                                  key={`${product.id}-${variant.color}`}
                                  className={`grid gap-1.5 rounded-lg px-2 py-1.5 md:grid-cols-[86px_minmax(0,1fr)] md:items-center ${
                                    hasVariantStock
                                      ? "bg-zinc-950"
                                      : "bg-zinc-950/45 opacity-60"
                                  }`}
                                >
                                  <span
                                    className={`truncate text-xs font-bold ${
                                      hasVariantStock
                                        ? "text-white"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {variant.color}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {variant.sizes.map((size) => {
                                      const hasStock = size.stock > 0;

                                      return (
                                        <span
                                          key={`${variant.color}-${size.size}`}
                                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                                            hasStock
                                              ? "bg-zinc-900 text-zinc-300"
                                              : "bg-zinc-950 text-zinc-600 ring-1 ring-zinc-900"
                                          }`}
                                        >
                                          <span
                                            className={
                                              hasStock ? "" : "line-through"
                                            }
                                          >
                                            {size.size}
                                          </span>
                                          <span
                                            className={`rounded px-1.5 py-0.5 font-black ${
                                              hasStock
                                                ? "bg-emerald-900/80 text-emerald-100"
                                                : "bg-zinc-900 text-zinc-600"
                                            }`}
                                          >
                                            {size.stock}
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </section>
      </div>

      {stockEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleSaveStock}
            className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50"
          >
            <div className="flex shrink-0 items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Editar stock
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  {stockEditor.product.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  SKU {getShortSku(stockEditor.product.sku)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStockEditor(null)}
                disabled={isSavingStock}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar editor de stock"
              >
                x
              </button>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-1.5">
                {stockEditor.variants.map((variant, variantIndex) => {
                  const variantTotal = variant.sizes.reduce(
                    (total, size) => total + Number(size.stock || 0),
                    0
                  );
                  const hasVariantStock = variantTotal > 0;

                  return (
                    <section
                      key={`${stockEditor.product.id}-${variant.color}`}
                      className={`grid gap-1.5 rounded-lg px-2 py-1.5 md:grid-cols-[92px_minmax(0,1fr)] md:items-center ${
                        hasVariantStock
                          ? "bg-zinc-900"
                          : "bg-zinc-900/45"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 md:block">
                        <h3
                          className={`truncate text-xs font-black ${
                            hasVariantStock ? "text-white" : "text-zinc-500"
                          }`}
                        >
                          {variant.color}
                        </h3>
                        <span className="mt-0 inline-flex rounded bg-zinc-950 px-1.5 py-0.5 text-xs font-black text-zinc-300 md:mt-1">
                          {variantTotal}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-wrap gap-1">
                        {variant.sizes.map((size, sizeIndex) => {
                          const hasStock = Number(size.stock || 0) > 0;

                          return (
                            <label
                              key={`${variant.color}-${size.size}`}
                              className={`inline-flex h-8 items-center overflow-hidden rounded-md text-xs font-semibold ring-1 ${
                                hasStock
                                  ? "bg-zinc-950 text-zinc-300 ring-zinc-800"
                                  : "bg-zinc-950/80 text-zinc-600 ring-zinc-900"
                              }`}
                            >
                              <span
                                className={`min-w-9 px-2 text-center ${
                                  hasStock ? "" : "line-through"
                                }`}
                              >
                                {size.size}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={size.stock}
                                onChange={(event) => {
                                  const nextStock = event.target.value;

                                  setStockEditor((currentEditor) => {
                                    if (!currentEditor) return currentEditor;

                                    return {
                                      ...currentEditor,
                                      variants: currentEditor.variants.map(
                                        (currentVariant, currentVariantIndex) =>
                                          currentVariantIndex === variantIndex
                                            ? {
                                                ...currentVariant,
                                                sizes:
                                                  currentVariant.sizes.map(
                                                    (
                                                      currentSize,
                                                      currentSizeIndex
                                                    ) =>
                                                      currentSizeIndex ===
                                                      sizeIndex
                                                        ? {
                                                            ...currentSize,
                                                            stock: nextStock,
                                                          }
                                                        : currentSize
                                                  ),
                                              }
                                            : currentVariant
                                      ),
                                    };
                                  });
                                }}
                                className={`h-full w-12 border-l px-1 text-center text-xs font-black outline-none transition focus:bg-white focus:text-black ${
                                  hasStock
                                    ? "border-emerald-900 bg-emerald-950 text-emerald-100"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-500"
                                }`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid shrink-0 grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStockEditor(null)}
                disabled={isSavingStock}
                className="h-11 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingStock}
                className="h-11 rounded-xl bg-white text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingStock ? "Guardando..." : "Guardar stock"}
              </button>
            </div>
          </form>
        </div>
      )}

      {priceEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <form
            onSubmit={handleSavePrices}
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Editar precios
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  {priceEditor.product.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  SKU {getShortSku(priceEditor.product.sku)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPriceEditor(null)}
                disabled={isSavingPrice}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar editor de precios"
              >
                x
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-zinc-500">
                  Costo
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceEditor.cost}
                  onChange={(event) =>
                    setPriceEditor((currentEditor) =>
                      currentEditor
                        ? {
                            ...currentEditor,
                            cost: formatInventoryPriceInput(
                              event.target.value
                            ),
                          }
                        : currentEditor
                    )
                  }
                  className="h-11 rounded-xl bg-zinc-900 px-3 text-lg font-black text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-zinc-500">
                  Precio web / mayorista
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceEditor.price}
                  onChange={(event) =>
                    setPriceEditor((currentEditor) =>
                      currentEditor
                        ? {
                            ...currentEditor,
                            price: formatInventoryPriceInput(
                              event.target.value
                            ),
                          }
                        : currentEditor
                    )
                  }
                  className="h-11 rounded-xl bg-zinc-900 px-3 text-lg font-black text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase text-zinc-500">
                  Precio minorista / local
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceEditor.retailPrice}
                  onChange={(event) =>
                    setPriceEditor((currentEditor) =>
                      currentEditor
                        ? {
                            ...currentEditor,
                            retailPrice: formatInventoryPriceInput(
                              event.target.value
                            ),
                          }
                        : currentEditor
                    )
                  }
                  className="h-11 rounded-xl bg-zinc-900 px-3 text-lg font-black text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriceEditor(null)}
                disabled={isSavingPrice}
                className="h-11 rounded-xl bg-zinc-900 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingPrice}
                className="h-11 rounded-xl bg-white text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPrice ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {quickProductDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3">
          <form
            onSubmit={handleCreateQuickProduct}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="truncate text-2xl font-black text-white">
                  {quickProductDraft.name || "Producto nuevo"}
                </h2>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-100">
                  Se crea oculto y sin fotos para completar en Admin tienda
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQuickProductDraft(null)}
                disabled={isSavingQuickProduct}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-sm font-black text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar creador de producto"
              >
                x
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <div className="grid content-start gap-4">
                  <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                    <h3 className="text-sm font-black uppercase text-zinc-300">
                      Datos
                    </h3>

                    <label className="grid min-w-0 gap-1.5">
                      <span className="text-xs font-semibold uppercase text-zinc-500">
                        Nombre
                      </span>
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={quickProductDraft.name}
                        onChange={(event) =>
                          setQuickProductDraft((currentDraft) =>
                            currentDraft
                              ? {
                                  ...currentDraft,
                                  name: event.target.value,
                                }
                              : currentDraft
                          )
                        }
                        className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                      />
                    </label>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-semibold uppercase text-zinc-500">
                          Categoria
                        </span>
                        <select
                          value={quickProductDraft.category}
                          onChange={(event) =>
                            setQuickProductDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    category: event.target.value,
                                  }
                                : currentDraft
                            )
                          }
                          className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                        >
                          <option value="">
                            Seleccionar
                          </option>
                          {categoryOptions.map((categoryOption) => (
                            <option
                              key={categoryOption.value}
                              value={categoryOption.value}
                            >
                              {categoryOption.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-semibold uppercase text-zinc-500">
                          SKU / Codigo
                        </span>
                        <div className="flex h-10 overflow-hidden rounded-xl bg-zinc-800">
                          <input
                            type="text"
                            value={quickProductDraft.skuCode}
                            maxLength={6}
                            onChange={(event) =>
                              setQuickProductDraft((currentDraft) =>
                                currentDraft
                                  ? {
                                      ...currentDraft,
                                      skuCode: normalizeSkuCode(
                                        event.target.value
                                      ),
                                    }
                                  : currentDraft
                              )
                            }
                            className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                          />
                        </div>
                      </label>
                    </div>
                  </section>

                  <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                    <h3 className="text-sm font-black uppercase text-zinc-300">
                      Precios
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-semibold uppercase text-zinc-500">
                          Costo
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Costo"
                          value={quickProductDraft.cost}
                          onChange={(event) =>
                            setQuickProductDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    cost: formatInventoryPriceInput(
                                      event.target.value
                                    ),
                                  }
                                : currentDraft
                            )
                          }
                          className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                        />
                      </label>

                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-semibold uppercase text-zinc-500">
                          Precio web
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Web"
                          value={quickProductDraft.price}
                          onChange={(event) =>
                            setQuickProductDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    price: formatInventoryPriceInput(
                                      event.target.value
                                    ),
                                  }
                                : currentDraft
                            )
                          }
                          className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                        />
                      </label>

                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-semibold uppercase text-zinc-500">
                          Precio local
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Local"
                          value={quickProductDraft.retailPrice}
                          onChange={(event) =>
                            setQuickProductDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    retailPrice: formatInventoryPriceInput(
                                      event.target.value
                                    ),
                                  }
                                : currentDraft
                            )
                          }
                          className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm font-bold outline-none ring-1 ring-transparent transition focus:ring-white"
                        />
                      </label>
                    </div>
                  </section>
                </div>

                <div className="grid content-start gap-4">
                  <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black uppercase text-zinc-300">
                        Stock inicial
                      </h3>
                      <button
                        type="button"
                        onClick={addQuickColor}
                        className="h-8 rounded-lg bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                      >
                        + color
                      </button>
                    </div>

                    <div className="grid gap-2">
                      {quickProductDraft.colors.map((colorItem, colorIndex) => {
                        const colorStock = colorItem.sizes.reduce(
                          (total, sizeItem) =>
                            total + Number(sizeItem.stock || 0),
                          0
                        );
                        const isSelected =
                          activeQuickColorIndex === colorIndex;

                        return (
                          <button
                            key={colorIndex}
                            type="button"
                            onClick={() =>
                              setSelectedQuickColorIndex(colorIndex)
                            }
                            className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-2 text-left transition ${
                              isSelected
                                ? "border-white bg-zinc-900"
                                : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                            }`}
                          >
                            <span
                              className="h-6 w-6 rounded-full border border-zinc-700"
                              style={{
                                backgroundColor:
                                  colorItem.hex || "#000000",
                              }}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-white">
                                {colorItem.color ||
                                  `Color ${colorIndex + 1}`}
                              </span>
                              <span className="text-xs font-semibold text-zinc-500">
                                {colorItem.sizes.length} talles
                              </span>
                            </span>
                            <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-black text-zinc-200">
                              {colorStock}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {activeQuickColor && (
                      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px_42px]">
                          <label className="grid min-w-0 gap-1.5">
                            <span className="text-xs font-semibold uppercase text-zinc-500">
                              Color
                            </span>
                            <input
                              type="text"
                              value={activeQuickColor.color}
                              placeholder="Negro"
                              onChange={(event) =>
                                updateQuickColor(activeQuickColorIndex, {
                                  color: event.target.value,
                                })
                              }
                              className="h-10 min-w-0 rounded-xl bg-zinc-800 px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-white"
                            />
                          </label>

                          <label className="grid min-w-0 gap-1.5">
                            <span className="text-xs font-semibold uppercase text-zinc-500">
                              Muestra
                            </span>
                            <input
                              type="color"
                              value={activeQuickColor.hex}
                              onChange={(event) =>
                                updateQuickColor(activeQuickColorIndex, {
                                  hex: event.target.value,
                                })
                              }
                              className="h-10 min-w-0 rounded-xl bg-zinc-800 p-1"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              removeQuickColor(activeQuickColorIndex)
                            }
                            disabled={quickProductDraft.colors.length === 1}
                            className="mt-auto h-10 rounded-xl border border-red-500/30 text-xs font-black text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            x
                          </button>
                        </div>

                        <div className="grid min-w-0 gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold uppercase text-zinc-500">
                              Talles y stock
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                addQuickSize(activeQuickColorIndex)
                              }
                              className="h-8 rounded-lg bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                            >
                              + talle
                            </button>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-zinc-800">
                            <div className="grid grid-cols-[minmax(0,1fr)_90px_42px] gap-2 bg-zinc-900 px-3 py-2 text-xs font-black uppercase text-zinc-500">
                              <span>Talle</span>
                              <span>Stock</span>
                              <span></span>
                            </div>

                            <div className="grid gap-1 bg-zinc-950 p-2">
                              {activeQuickColor.sizes.map(
                                (sizeItem, sizeIndex) => {
                                  const hasStock =
                                    Number(sizeItem.stock || 0) > 0;

                                  return (
                                    <div
                                      key={sizeIndex}
                                      className={`grid grid-cols-[minmax(0,1fr)_90px_42px] items-center gap-2 rounded-lg p-1.5 ${
                                        hasStock
                                          ? "bg-zinc-900"
                                          : "bg-zinc-900/50"
                                      }`}
                                    >
                                      <input
                                        type="text"
                                        value={sizeItem.size}
                                        placeholder="S"
                                        onChange={(event) =>
                                          updateQuickSize(
                                            activeQuickColorIndex,
                                            sizeIndex,
                                            {
                                              size: event.target.value,
                                            }
                                          )
                                        }
                                        className="h-9 min-w-0 rounded-lg bg-zinc-800 px-3 text-sm font-bold text-white outline-none ring-1 ring-transparent transition focus:ring-white"
                                      />

                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={sizeItem.stock}
                                        onChange={(event) =>
                                          updateQuickSize(
                                            activeQuickColorIndex,
                                            sizeIndex,
                                            {
                                              stock: event.target.value,
                                            }
                                          )
                                        }
                                        className={`h-9 rounded-lg px-2 text-center text-sm font-black outline-none ring-1 ring-transparent transition focus:bg-white focus:text-black ${
                                          hasStock
                                            ? "bg-emerald-950 text-emerald-100"
                                            : "bg-zinc-800 text-zinc-500"
                                        }`}
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeQuickSize(
                                            activeQuickColorIndex,
                                            sizeIndex
                                          )
                                        }
                                        disabled={
                                          activeQuickColor.sizes.length === 1
                                        }
                                        className="h-9 rounded-lg border border-red-500/30 text-xs font-black text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        x
                                      </button>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                    <h3 className="text-sm font-black uppercase text-zinc-300">
                      Fotos y publicacion
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Este producto queda oculto y sin imagenes. Usalo para
                      cargar costos, precios y stock rapido; despues completas
                      fotos, detalles y publicacion en Admin tienda.
                    </p>
                  </section>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3">
              <button
                type="button"
                onClick={() => setQuickProductDraft(null)}
                disabled={isSavingQuickProduct}
                className="h-10 rounded-xl bg-zinc-800 px-5 text-sm font-bold text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingQuickProduct}
                className="h-10 rounded-xl bg-emerald-400 px-5 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingQuickProduct ? "Creando..." : "Crear oculto"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
