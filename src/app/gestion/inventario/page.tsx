"use client";

import {
  type FormEvent,
  type UIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  Images,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Truck,
  X,
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
import { getProductImage } from "@/lib/productDisplay";
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
  | "inactive"
  | "archived";
type QuickProductDraft = {
  name: string;
  skuCode: string;
  category: string;
  cost: string;
  price: string;
  curvePrice: string;
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
type InventoryProductEditor = {
  product: Product;
  selectedColorIndex: number;
  curveEnabled: boolean;
  cost: string;
  price: string;
  curvePrice: string;
  retailPrice: string;
  variants: Array<{
    color: string;
    hex: string;
    images: string[];
    sizes: Array<{
      size: string;
      stock: string;
    }>;
  }>;
};

const lowStockLimit = 2;
const inventoryScrollStorageKey = "aivlis:gestion:inventario:scroll-top";
const inventoryTableColumns =
  "grid-cols-[76px_minmax(0,1fr)_100px_64px_96px_104px_96px_104px_104px]";
const criticalStockTableColumns =
  "grid-cols-[76px_minmax(0,1fr)_120px_100px_90px_90px]";
const inventoryHeaderCellClass =
  "flex min-h-9 items-center px-2";
const inventoryRowCellClass =
  "flex h-full min-h-10 items-center px-2";

const inventoryViews: Array<{
  label: string;
  value: InventoryTab;
}> = [
  { label: "Todos", value: "all" },
  { label: "Bajo stock", value: "low" },
  { label: "Sin stock", value: "out" },
  { label: "Ocultos", value: "inactive" },
  { label: "Archivados", value: "archived" },
];

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
    href: "/gestion/envios",
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
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null
  );
  const [expandedProductColor, setExpandedProductColor] = useState("");
  const [productEditor, setProductEditor] =
    useState<InventoryProductEditor | null>(null);
  const [isSavingProductEditor, setIsSavingProductEditor] = useState(false);
  const [isSavingQuickProduct, setIsSavingQuickProduct] =
    useState(false);
  const [savingActiveProductId, setSavingActiveProductId] = useState<
    number | null
  >(null);
  const [savingArchivedProductId, setSavingArchivedProductId] = useState<
    number | null
  >(null);
  const [inventoryNotice, setInventoryNotice] = useState("");
  const [quickProductDraft, setQuickProductDraft] =
    useState<QuickProductDraft | null>(null);
  const [selectedQuickColorIndex, setSelectedQuickColorIndex] =
    useState(0);
  const inventoryScrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isAllowed || isLoadingProducts || products.length === 0) return;

    const storedScrollTop = Number(
      window.sessionStorage.getItem(inventoryScrollStorageKey) ?? 0
    );

    if (!Number.isFinite(storedScrollTop) || storedScrollTop <= 0) return;

    const frame = window.requestAnimationFrame(() => {
      if (inventoryScrollRef.current) {
        inventoryScrollRef.current.scrollTop = storedScrollTop;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isAllowed, isLoadingProducts, products.length]);

  const handleInventoryScroll = (event: UIEvent<HTMLDivElement>) => {
    window.sessionStorage.setItem(
      inventoryScrollStorageKey,
      String(event.currentTarget.scrollTop)
    );
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
    setProducts([]);
  };

  const openProductEditor = (product: Product) => {
    setInventoryError("");
    setInventoryNotice("");
    setProductEditor({
      product,
      selectedColorIndex: 0,
      curveEnabled: product.curveEnabled,
      cost: formatInventoryPriceInput(product.cost),
      price: formatInventoryPriceInput(product.price),
      curvePrice: formatInventoryPriceInput(product.curvePrice),
      retailPrice: formatInventoryPriceInput(product.retailPrice),
      variants: product.variants.map((variant) => ({
        color: variant.color,
        hex: variant.hex,
        images: [...variant.images],
        sizes: variant.sizes.map((size) => ({
          size: size.size,
          stock: String(size.stock),
        })),
      })),
    });
  };

  const toggleExpandedProduct = (product: Product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      setExpandedProductColor("");
      return;
    }

    const firstAvailableVariant =
      product.variants.find((variant) =>
        variant.sizes.some((size) => size.stock > 0)
      ) ?? product.variants[0];

    setExpandedProductId(product.id);
    setExpandedProductColor(firstAvailableVariant?.color ?? "");
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
      curvePrice: "",
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

  const handleSaveProductEditor = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!productEditor || isSavingProductEditor) return;

    const nextPrice = parseInventoryPriceInput(productEditor.price);
    const nextCurvePrice = parseInventoryPriceInput(productEditor.curvePrice);
    const nextRetailPrice = parseInventoryPriceInput(
      productEditor.retailPrice
    );
    const nextCost = parseInventoryPriceInput(productEditor.cost);

    if (
      !Number.isFinite(nextCost) ||
      !Number.isFinite(nextPrice) ||
      !Number.isFinite(nextCurvePrice) ||
      !Number.isFinite(nextRetailPrice) ||
      nextCost < 0 ||
      nextPrice < 0 ||
      nextCurvePrice < 0 ||
      nextRetailPrice < 0
    ) {
      setInventoryError("Costo y precios tienen que ser numeros validos.");
      return;
    }

    if (nextRetailPrice < nextPrice) {
      setInventoryError("El precio minorista no puede ser menor al precio mayorista.");
      return;
    }

    if (productEditor.curveEnabled && nextCurvePrice <= 0) {
      setInventoryError("Carga un precio curva mayor a 0 para habilitarla.");
      return;
    }

    const normalizedColorNames = productEditor.variants.map((variant) =>
      variant.color.trim().toLowerCase()
    );

    if (
      productEditor.variants.length === 0 ||
      normalizedColorNames.some((color) => !color)
    ) {
      setInventoryError("Cada producto necesita al menos un color con nombre.");
      return;
    }

    if (new Set(normalizedColorNames).size !== normalizedColorNames.length) {
      setInventoryError("No puede haber colores repetidos.");
      return;
    }

    for (const variant of productEditor.variants) {
      const normalizedSizes = variant.sizes.map((size) =>
        size.size.trim().toLowerCase()
      );

      if (normalizedSizes.length === 0 || normalizedSizes.some((size) => !size)) {
        setInventoryError(`El color ${variant.color.trim()} necesita al menos un talle.`);
        return;
      }

      if (new Set(normalizedSizes).size !== normalizedSizes.length) {
        setInventoryError(`El color ${variant.color.trim()} tiene talles repetidos.`);
        return;
      }
    }

    setIsSavingProductEditor(true);
    setInventoryError("");

    try {
      const nextVariants = productEditor.variants.map((variant) => {
          const nextSizes = variant.sizes.map((size) => {
            const nextStock = Number(size.stock || 0);

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
              size: size.size.trim(),
              stock: nextStock,
            };
          });

          return {
            color: variant.color.trim(),
            hex: variant.hex || "#000000",
            sizes: nextSizes,
            stock: nextSizes.reduce((total, size) => total + size.stock, 0),
            images: [...variant.images],
          };
        });
      const nextTotalStock = nextVariants.reduce(
        (total, variant) => total + (variant.stock ?? 0),
        0
      );
      const { error } = await supabase
        .from("products")
        .update({
          cost: nextCost,
          price: nextPrice,
          curve_price: nextCurvePrice || nextPrice,
          curve_enabled: productEditor.curveEnabled,
          retail_price: nextRetailPrice,
          variants: nextVariants,
          stock: nextTotalStock,
        })
        .eq("id", productEditor.product.id);

      if (error) {
        throw error;
      }

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productEditor.product.id
            ? {
                ...product,
                cost: nextCost,
                price: nextPrice,
                curvePrice: nextCurvePrice || nextPrice,
                curveEnabled: productEditor.curveEnabled,
                retailPrice: nextRetailPrice,
                variants: nextVariants,
                stock: nextTotalStock,
              }
            : product
        )
      );
      setInventoryNotice(`${productEditor.product.name}: cambios guardados.`);
      setProductEditor(null);
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios."
      );
    } finally {
      setIsSavingProductEditor(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (savingActiveProductId || product.archivedAt) return;

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

  const handleToggleArchived = async (product: Product) => {
    if (savingArchivedProductId) return;

    const isRestoring = Boolean(product.archivedAt);
    const stock = getProductStock(product);
    const confirmed = window.confirm(
      isRestoring
        ? `Restaurar "${product.name}"? Volvera a estar disponible en Inventario y Punto de venta.`
        : `Archivar "${product.name}"? Se ocultara del catalogo y Punto de venta, pero conservara su historial y sus ${stock} unidades de stock.`
    );

    if (!confirmed) return;

    const nextArchivedAt = isRestoring ? null : new Date().toISOString();

    setSavingArchivedProductId(product.id);
    setInventoryError("");

    try {
      const { error } = await supabase
        .from("products")
        .update({ archived_at: nextArchivedAt })
        .eq("id", product.id);

      if (error) {
        throw error;
      }

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id
            ? { ...currentProduct, archivedAt: nextArchivedAt }
            : currentProduct
        )
      );
      setExpandedProductId(null);
      setExpandedProductColor("");
      setInventoryNotice(
        `${product.name}: ${isRestoring ? "restaurado" : "archivado"}.`
      );
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : `No se pudo ${isRestoring ? "restaurar" : "archivar"} el producto.`
      );
    } finally {
      setSavingArchivedProductId(null);
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
    const curvePrice = parseInventoryPriceInput(
      quickProductDraft.curvePrice || quickProductDraft.price
    );
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
      !Number.isFinite(curvePrice) ||
      !Number.isFinite(retailPrice) ||
      cost < 0 ||
      price <= 0 ||
      curvePrice <= 0 ||
      retailPrice <= 0
    ) {
      setInventoryError("Costo y precios tienen que ser numeros validos.");
      return;
    }

    if (retailPrice < price) {
      setInventoryError("El precio minorista no puede ser menor al precio mayorista.");
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
          curve_price: curvePrice,
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
    const availableProducts = products.filter((product) => !product.archivedAt);
    const activeProducts = availableProducts.filter((product) => product.active);
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
      inactiveProducts: availableProducts.filter((product) => !product.active),
      archivedProducts: products.filter((product) => product.archivedAt),
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
    .filter((product) => product.active && !product.archivedAt)
    .flatMap(getCriticalStockEntries);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const stock = getProductStock(product);
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    const matchesTab =
      (activeTab === "all" && !product.archivedAt) ||
      (activeTab === "low" &&
        product.active &&
        !product.archivedAt &&
        getLowStockEntries(product).length > 0) ||
      (activeTab === "out" &&
        product.active &&
        !product.archivedAt &&
        stock <= 0) ||
      (activeTab === "inactive" && !product.active && !product.archivedAt) ||
      (activeTab === "archived" && Boolean(product.archivedAt));
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
  const sortedProducts = [...visibleProducts].sort(
    (firstProduct, secondProduct) => secondProduct.id - firstProduct.id
  );
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
  const selectedProductEditorColorIndex = productEditor
    ? Math.min(
        productEditor.selectedColorIndex,
        Math.max(productEditor.variants.length - 1, 0)
      )
    : 0;
  const selectedProductEditorVariant =
    productEditor?.variants[selectedProductEditorColorIndex] ?? null;
  const maxProductEditorSizeCount = productEditor
    ? Math.max(
        ...productEditor.variants.map((variant) => variant.sizes.length),
        0
      )
    : 0;

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
              Admin catalogo
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

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden px-3 py-2">
          <header className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-1 pb-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-black text-white">Inventario</h1>
                <p className="text-xs font-semibold text-zinc-500">
                  {stockSummary.activeProducts.length} activos · {stockSummary.stockTotal} unidades · {formatPrice(stockSummary.totalValue)} en costo
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={openQuickProductCreator}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-400 px-3 text-xs font-black text-black transition hover:bg-emerald-300"
              >
                <Plus size={15} />
                Nuevo producto
              </button>

              <Link
                href="/admin"
                title="Editar catalogo web"
                aria-label="Editar catalogo web"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <Settings size={16} />
              </Link>
              <button
                type="button"
                onClick={() => void refreshProducts()}
                disabled={isLoadingProducts}
                title="Actualizar inventario"
                aria-label="Actualizar inventario"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={isLoadingProducts ? "animate-spin" : ""}
                />
              </button>
            </div>
          </header>

          {inventoryError && (
            <div className="mb-2 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
              {inventoryError}
            </div>
          )}

          {inventoryNotice && (
            <div className="mb-2 shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">
              {inventoryNotice}
            </div>
          )}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
            <div className="mb-2 flex shrink-0 items-center gap-2">
              <label className="relative block min-w-0 flex-1 lg:max-w-xl">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar producto, SKU o color"
                  className="h-9 w-full rounded-lg bg-zinc-900 pl-9 pr-3 text-xs font-semibold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
                />
              </label>

              <select
                value={activeTab}
                onChange={(event) => {
                  setActiveTab(event.target.value as InventoryTab);
                  setExpandedProductId(null);
                }}
                aria-label="Filtrar por estado de stock"
                className="h-9 w-36 rounded-lg bg-zinc-900 px-2.5 text-xs font-bold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
              >
                {inventoryViews.map((view) => (
                  <option key={view.value} value={view.value}>
                    {view.label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setExpandedProductId(null);
                }}
                aria-label="Filtrar por categoria"
                className="h-9 w-44 rounded-lg bg-zinc-900 px-2.5 text-xs font-bold text-white outline-none ring-1 ring-zinc-800 transition focus:ring-white"
              >
                <option value="all">Todas las categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-[#070707] shadow-2xl shadow-black/20">
              {activeTab === "critical" ? (
                <>
                  <div
                    ref={inventoryScrollRef}
                    onScroll={handleInventoryScroll}
                    className="h-full overflow-y-auto pb-12 [scrollbar-gutter:stable]"
                  >
                  <div className={`sticky top-0 z-10 grid ${criticalStockTableColumns} divide-x divide-zinc-600 border-b border-zinc-700 bg-zinc-900 px-2 text-[13px] font-bold uppercase text-zinc-300`}>
                    <span className={inventoryHeaderCellClass}>SKU</span>
                    <span className={inventoryHeaderCellClass}>Producto</span>
                    <span className={inventoryHeaderCellClass}>Categoria</span>
                    <span className={inventoryHeaderCellClass}>Color</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Talle</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Stock</span>
                  </div>
                    {filteredCriticalEntries.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-zinc-500">
                        No hay talles criticos para mostrar.
                      </p>
                    ) : (
                      filteredCriticalEntries.map((entry, index) => (
                        <div
                          key={`${entry.product.id}-${entry.color}-${entry.size}`}
                          className={`grid ${criticalStockTableColumns} items-stretch divide-x divide-zinc-700 border-b border-zinc-800 px-2 text-[15px] transition hover:bg-zinc-800/45 ${
                            index % 2 === 0 ? "bg-zinc-950/45" : "bg-zinc-900/20"
                          }`}
                        >
                          <span className={inventoryRowCellClass}>
                            <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-[13px] font-bold text-zinc-300">
                              {getShortSku(entry.product.sku)}
                            </span>
                          </span>
                          <span className={`${inventoryRowCellClass} min-w-0 truncate font-bold text-white`}>
                            {entry.product.name}
                          </span>
                          <span className={`${inventoryRowCellClass} min-w-0 truncate text-[13px] font-semibold text-zinc-400`}>
                            {entry.product.category || "-"}
                          </span>
                          <span className={`${inventoryRowCellClass} min-w-0 truncate text-[13px] font-bold text-zinc-200`}>
                            {entry.color}
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center`}>
                            <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-xs font-black text-zinc-200">
                              {entry.size}
                            </span>
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center`}>
                            <span
                              className={`w-fit rounded-lg px-2 py-1 text-xs font-black ${
                                entry.stock <= 0
                                  ? "bg-red-500/15 text-red-200"
                                  : "bg-yellow-500/15 text-yellow-200"
                              }`}
                            >
                              {entry.stock}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    ref={inventoryScrollRef}
                    onScroll={handleInventoryScroll}
                    className="h-full overflow-y-auto pb-12 [scrollbar-gutter:stable]"
                  >
                  <div className={`sticky top-0 z-10 grid ${inventoryTableColumns} divide-x divide-zinc-600 border-b border-zinc-700 bg-zinc-900 px-2 text-[13px] font-bold uppercase text-zinc-300`}>
                    <span className={inventoryHeaderCellClass}>SKU</span>
                    <span className={inventoryHeaderCellClass}>Producto</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Categoria</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Stock</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Costo</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Mayorista</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Curva</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Minorista</span>
                    <span className={`${inventoryHeaderCellClass} justify-center`}>Estado</span>
                  </div>
                    {sortedProducts.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-zinc-500">
                        No hay productos para mostrar.
                      </p>
                    ) : (
                      sortedProducts.map((product, index) => {
                    const stock = getProductStock(product);
                    const selectedInventoryVariant =
                      product.variants.find(
                        (variant) => variant.color === expandedProductColor
                      ) ?? product.variants[0] ?? null;

                    return (
                      <article
                        key={product.id}
                        className={`border-b border-zinc-900/80 ${
                          index % 2 === 0 ? "bg-zinc-950/45" : "bg-zinc-900/20"
                        }`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={expandedProductId === product.id}
                          onClick={() => toggleExpandedProduct(product)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleExpandedProduct(product);
                            }
                          }}
                          className={`grid ${inventoryTableColumns} cursor-pointer items-stretch divide-x divide-zinc-700 px-2 text-[15px] transition ${
                            expandedProductId === product.id
                              ? "bg-emerald-950/35 shadow-[inset_3px_0_0_#34d399] hover:bg-emerald-950/45"
                              : "hover:bg-zinc-800/45"
                          }`}
                        >
                          <span className={inventoryRowCellClass}>
                            <span className="w-fit rounded-lg bg-zinc-800 px-2 py-1 text-[13px] font-bold text-zinc-300">
                              {getShortSku(product.sku)}
                            </span>
                          </span>
                          <div className={`${inventoryRowCellClass} min-w-0`}>
                            <p className="truncate font-bold text-white">
                              {product.name}
                            </p>
                          </div>
                          <span className={`${inventoryRowCellClass} min-w-0 justify-center truncate text-center text-[13px] font-semibold text-zinc-400`}>
                            {product.category || "-"}
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center text-center font-black text-white`}>
                            {stock}
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center text-center font-black tabular-nums text-zinc-300`}>
                            {product.cost > 0 ? formatPrice(product.cost) : "-"}
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center text-center font-black tabular-nums text-white`}>
                            {formatPrice(product.price)}
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center text-center font-black tabular-nums text-sky-100`}>
                            {product.curveEnabled
                              ? formatPrice(product.curvePrice)
                              : "-"}
                          </span>
                          <span className={`${inventoryRowCellClass} justify-center text-center font-black tabular-nums text-zinc-200`}>
                            {formatPrice(product.retailPrice)}
                          </span>
                          <div className={`${inventoryRowCellClass} justify-center`}>
                            {product.archivedAt ? (
                              <span className="flex h-7 w-fit items-center rounded-full bg-amber-500/15 px-2.5 text-xs font-black text-amber-200">
                                Archivado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleToggleActive(product);
                                }}
                                disabled={savingActiveProductId === product.id}
                                className={`flex h-7 w-fit cursor-pointer items-center rounded-full px-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
                            )}
                          </div>
                        </div>

                        {expandedProductId === product.id && (
                          <div className="border-t border-zinc-700 bg-zinc-900/30 px-4 py-3">
                            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                              <div className="relative h-24 w-[72px] overflow-hidden rounded-lg bg-zinc-950">
                                <Image
                                  src={getProductImage(product)}
                                  alt={product.name}
                                  fill
                                  sizes="72px"
                                  className="object-contain"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="mr-1 text-xs font-bold uppercase text-zinc-500">
                                      Colores ({product.variants.length})
                                    </span>
                                    {product.variants.map((variant) => {
                                      const variantStock = variant.sizes.reduce(
                                        (total, size) => total + size.stock,
                                        0
                                      );
                                      const isSelected =
                                        selectedInventoryVariant?.color ===
                                        variant.color;
                                      const hasVariantStock = variantStock > 0;

                                      return (
                                        <button
                                          key={`${product.id}-${variant.color}`}
                                          type="button"
                                          onClick={() =>
                                            setExpandedProductColor(variant.color)
                                          }
                                          className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-xs font-bold transition ${
                                            isSelected
                                              ? "border-white bg-white text-black"
                                              : hasVariantStock
                                                ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                                                : "border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-zinc-700"
                                          }`}
                                        >
                                          <span>{variant.color}</span>
                                          <span
                                            className={
                                              isSelected
                                                ? hasVariantStock
                                                  ? "text-emerald-700"
                                                  : "text-red-700"
                                                : hasVariantStock
                                                  ? "text-emerald-300"
                                                  : "text-red-300/70"
                                            }
                                          >
                                            {variantStock} u.
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openProductEditor(product)}
                                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 text-[11px] font-black text-black transition hover:bg-zinc-200"
                                    >
                                      <Settings size={13} />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleToggleArchived(product)
                                      }
                                      disabled={
                                        savingArchivedProductId === product.id
                                      }
                                      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                        product.archivedAt
                                          ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                                          : "bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                                      }`}
                                    >
                                      {product.archivedAt ? (
                                        <ArchiveRestore size={13} />
                                      ) : (
                                        <Archive size={13} />
                                      )}
                                      {savingArchivedProductId === product.id
                                        ? "..."
                                        : product.archivedAt
                                          ? "Restaurar"
                                          : "Archivar"}
                                    </button>
                                  </div>
                                </div>

                                {selectedInventoryVariant ? (
                                  <div className="mt-3 max-w-xl overflow-hidden border-y border-zinc-800">
                                    <div className="grid grid-cols-[120px_120px] justify-center gap-10 border-b border-zinc-800 py-1.5 text-[11px] font-bold uppercase text-zinc-500">
                                      <span>Talle</span>
                                      <span className="text-right">Stock</span>
                                    </div>
                                    <div className="divide-y divide-zinc-800/80">
                                      {selectedInventoryVariant.sizes.map(
                                        (size) => {
                                          const hasStock = size.stock > 0;

                                          return (
                                            <div
                                              key={`${selectedInventoryVariant.color}-${size.size}`}
                                              className="grid grid-cols-[120px_120px] items-center justify-center gap-10 py-1.5"
                                            >
                                              <span
                                                className={`w-fit min-w-9 rounded-md border px-2 py-1 text-center text-xs font-black ${
                                                  hasStock
                                                    ? "border-zinc-700 bg-zinc-900 text-white"
                                                    : "border-zinc-900 bg-zinc-950 text-zinc-600 line-through"
                                                }`}
                                              >
                                                {size.size}
                                              </span>
                                              <span
                                                className={`text-right text-sm font-black tabular-nums ${
                                                  hasStock
                                                    ? "text-emerald-300"
                                                    : "text-red-300/70"
                                                }`}
                                              >
                                                {size.stock} u.
                                              </span>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-3 text-sm text-zinc-500">
                                    Este producto no tiene colores cargados.
                                  </p>
                                )}
                              </div>
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

      {productEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleSaveProductEditor}
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/50"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                  <Image
                    src={getProductImage(productEditor.product)}
                    alt={productEditor.product.name}
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-white">
                    {productEditor.product.name}
                  </h2>
                  <span className="mt-0.5 inline-flex rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
                    SKU {getShortSku(productEditor.product.sku)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProductEditor(null)}
                disabled={isSavingProductEditor}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar editor"
              >
                <X size={18} />
              </button>
            </header>

            {inventoryError && (
              <div className="mx-5 mt-3 shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                {inventoryError}
              </div>
            )}

            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
              <section className="min-h-0 overflow-y-auto border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase text-zinc-300">
                    Talles y stock
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500">
                      {productEditor.variants.length} colores
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setProductEditor((currentEditor) => {
                          if (!currentEditor) return currentEditor;

                          const nextColorIndex = currentEditor.variants.length;

                          return {
                            ...currentEditor,
                            selectedColorIndex: nextColorIndex,
                            variants: [
                              ...currentEditor.variants,
                              {
                                color: "",
                                hex: "#000000",
                                images: [],
                                sizes: [{ size: "", stock: "" }],
                              },
                            ],
                          };
                        })
                      }
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 px-2.5 text-xs font-black text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                      <Plus size={14} />
                      Color
                    </button>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {productEditor.variants.map((variant, variantIndex) => {
                    const variantTotal = variant.sizes.reduce(
                      (total, size) => total + Number(size.stock || 0),
                      0
                    );
                    const isSelected =
                      selectedProductEditorColorIndex === variantIndex;

                    return (
                      <button
                        key={`${productEditor.product.id}-${variantIndex}`}
                        type="button"
                        onClick={() =>
                          setProductEditor((currentEditor) =>
                            currentEditor
                              ? {
                                  ...currentEditor,
                                  selectedColorIndex: variantIndex,
                                }
                              : currentEditor
                          )
                        }
                        className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-xs font-bold transition ${
                          isSelected
                            ? "border-white bg-white text-black"
                            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <span>{variant.color.trim() || "Nuevo color"}</span>
                        <span
                          className={
                            isSelected
                              ? "text-emerald-700"
                              : variantTotal > 0
                                ? "text-emerald-300"
                                : "text-red-300/70"
                          }
                        >
                          {variantTotal} u.
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedProductEditorVariant ? (
                  <section
                    className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/45"
                    style={{
                      minHeight: `${Math.max(
                        170,
                        72 + maxProductEditorSizeCount * 42
                      )}px`,
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          type="text"
                          value={selectedProductEditorVariant.color}
                          placeholder="Nombre del color"
                          aria-label="Nombre del color"
                          onChange={(event) => {
                            const nextColor = event.target.value;

                            setProductEditor((currentEditor) =>
                              currentEditor
                                ? {
                                    ...currentEditor,
                                    variants: currentEditor.variants.map(
                                      (variant, variantIndex) =>
                                        variantIndex ===
                                        selectedProductEditorColorIndex
                                          ? { ...variant, color: nextColor }
                                          : variant
                                    ),
                                  }
                                : currentEditor
                            );
                          }}
                          className="h-9 w-44 min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-white outline-none transition focus:border-white"
                        />
                        <input
                          type="color"
                          value={selectedProductEditorVariant.hex || "#000000"}
                          aria-label="Color del swatch"
                          onChange={(event) => {
                            const nextHex = event.target.value;

                            setProductEditor((currentEditor) =>
                              currentEditor
                                ? {
                                    ...currentEditor,
                                    variants: currentEditor.variants.map(
                                      (variant, variantIndex) =>
                                        variantIndex ===
                                        selectedProductEditorColorIndex
                                          ? { ...variant, hex: nextHex }
                                          : variant
                                    ),
                                  }
                                : currentEditor
                            );
                          }}
                          className="h-9 w-11 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 p-1"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setProductEditor((currentEditor) =>
                              currentEditor
                                ? {
                                    ...currentEditor,
                                    variants: currentEditor.variants.map(
                                      (variant, variantIndex) =>
                                        variantIndex ===
                                        selectedProductEditorColorIndex
                                          ? {
                                              ...variant,
                                              sizes: [
                                                ...variant.sizes,
                                                { size: "", stock: "" },
                                              ],
                                            }
                                          : variant
                                    ),
                                  }
                                : currentEditor
                            )
                          }
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 px-2.5 text-xs font-black text-zinc-200 transition hover:bg-zinc-800"
                        >
                          <Plus size={14} />
                          Talle
                        </button>
                        <button
                          type="button"
                          disabled={productEditor.variants.length <= 1}
                          onClick={() =>
                            setProductEditor((currentEditor) => {
                              if (!currentEditor) return currentEditor;

                              return {
                                ...currentEditor,
                                selectedColorIndex: Math.max(
                                  selectedProductEditorColorIndex - 1,
                                  0
                                ),
                                variants: currentEditor.variants.filter(
                                  (_, variantIndex) =>
                                    variantIndex !==
                                    selectedProductEditorColorIndex
                                ),
                              };
                            })
                          }
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Eliminar color"
                          title="Eliminar color"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mx-auto w-full max-w-md px-3 pb-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_110px_36px] border-b border-zinc-800 py-1.5 text-[11px] font-bold uppercase text-zinc-500">
                        <span>Talle</span>
                        <span className="text-center">Stock</span>
                        <span />
                      </div>
                      {selectedProductEditorVariant.sizes.map(
                        (size, sizeIndex) => {
                          const hasStock = Number(size.stock || 0) > 0;

                          return (
                            <div
                              key={`${selectedProductEditorColorIndex}-${sizeIndex}`}
                              className="grid grid-cols-[minmax(0,1fr)_110px_36px] items-center border-b border-zinc-800/70 py-1.5 last:border-b-0"
                            >
                              <input
                                type="text"
                                value={size.size}
                                placeholder="Talle"
                                aria-label={`Talle de ${selectedProductEditorVariant.color || "color nuevo"}`}
                                onChange={(event) => {
                                  const nextSize = event.target.value;

                                  setProductEditor((currentEditor) =>
                                    currentEditor
                                      ? {
                                          ...currentEditor,
                                          variants: currentEditor.variants.map(
                                            (variant, variantIndex) =>
                                              variantIndex ===
                                              selectedProductEditorColorIndex
                                                ? {
                                                    ...variant,
                                                    sizes: variant.sizes.map(
                                                      (currentSize, currentSizeIndex) =>
                                                        currentSizeIndex === sizeIndex
                                                          ? {
                                                              ...currentSize,
                                                              size: nextSize,
                                                            }
                                                          : currentSize
                                                    ),
                                                  }
                                                : variant
                                          ),
                                        }
                                      : currentEditor
                                  );
                                }}
                                className={`h-9 w-24 rounded-lg border px-2 text-center text-xs font-black outline-none transition focus:border-white focus:bg-white focus:text-black ${
                                  hasStock
                                    ? "border-zinc-700 bg-zinc-900 text-white"
                                    : "border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500"
                                }`}
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                value={size.stock}
                                aria-label={`Stock ${selectedProductEditorVariant.color}, talle ${size.size}`}
                                onChange={(event) => {
                                  const nextStock = event.target.value.replace(
                                    /\D/g,
                                    ""
                                  );

                                  setProductEditor((currentEditor) => {
                                    if (!currentEditor) return currentEditor;

                                    return {
                                      ...currentEditor,
                                      variants: currentEditor.variants.map(
                                        (currentVariant, currentVariantIndex) =>
                                          currentVariantIndex ===
                                          selectedProductEditorColorIndex
                                            ? {
                                                ...currentVariant,
                                                sizes: currentVariant.sizes.map(
                                                  (
                                                    currentSize,
                                                    currentSizeIndex
                                                  ) =>
                                                    currentSizeIndex === sizeIndex
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
                                className={`mx-auto h-9 w-20 rounded-lg border px-2 text-center text-sm font-black outline-none transition focus:border-white focus:bg-white focus:text-black ${
                                  hasStock
                                    ? "border-emerald-900 bg-emerald-950/80 text-emerald-100"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-500"
                                }`}
                              />
                              <button
                                type="button"
                                disabled={selectedProductEditorVariant.sizes.length <= 1}
                                onClick={() =>
                                  setProductEditor((currentEditor) =>
                                    currentEditor
                                      ? {
                                          ...currentEditor,
                                          variants: currentEditor.variants.map(
                                            (variant, variantIndex) =>
                                              variantIndex ===
                                              selectedProductEditorColorIndex
                                                ? {
                                                    ...variant,
                                                    sizes: variant.sizes.filter(
                                                      (_, currentSizeIndex) =>
                                                        currentSizeIndex !== sizeIndex
                                                    ),
                                                  }
                                                : variant
                                          ),
                                        }
                                      : currentEditor
                                  )
                                }
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-25"
                                aria-label={`Eliminar talle ${size.size || "nuevo"}`}
                                title="Eliminar talle"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Este producto no tiene colores cargados.
                  </p>
                )}
              </section>

              <section className="min-h-0 overflow-y-auto bg-zinc-900/20 p-4">
                <h3 className="mb-3 text-sm font-black uppercase text-zinc-300">
                  Costo y precios
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setProductEditor((currentEditor) =>
                      currentEditor
                        ? {
                            ...currentEditor,
                            curveEnabled: !currentEditor.curveEnabled,
                          }
                        : currentEditor
                    )
                  }
                  className={`mb-3 flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-3 text-sm font-bold transition ${
                    productEditor.curveEnabled
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span>Curva en punto de venta</span>
                  <span
                    className={`rounded-md px-2 py-1 text-[11px] font-black ${
                      productEditor.curveEnabled
                        ? "bg-emerald-400 text-black"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {productEditor.curveEnabled ? "Habilitada" : "Desactivada"}
                  </span>
                </button>

                <div className="grid gap-3.5">
                  {(
                    [
                      ["Costo", "cost"],
                      ["Precio mayorista", "price"],
                      ...(productEditor.curveEnabled
                        ? [["Precio curva", "curvePrice"]]
                        : []),
                      ["Precio minorista / local", "retailPrice"],
                    ] as Array<[
                      string,
                      "cost" | "price" | "curvePrice" | "retailPrice",
                    ]>
                  ).map(([label, field]) => (
                    <label key={field} className="grid gap-1.5">
                      <span className="text-xs font-bold uppercase text-zinc-500">
                        {label}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={productEditor[field]}
                        onChange={(event) =>
                          setProductEditor((currentEditor) =>
                            currentEditor
                              ? {
                                  ...currentEditor,
                                  [field]: formatInventoryPriceInput(
                                    event.target.value
                                  ),
                                }
                              : currentEditor
                          )
                        }
                        className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base font-black text-white outline-none transition focus:border-white"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-zinc-800 px-4 py-3">
              <button
                type="button"
                onClick={() => setProductEditor(null)}
                disabled={isSavingProductEditor}
                className="h-10 min-w-28 cursor-pointer rounded-lg px-4 text-sm font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingProductEditor}
                className="h-10 min-w-44 cursor-pointer rounded-lg bg-white px-5 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProductEditor ? "Guardando..." : "Guardar cambios"}
              </button>
            </footer>
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
                  Se crea oculto y sin fotos para completar en Admin catalogo
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
                          Precio mayorista
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Mayorista"
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
                      fotos, detalles y publicacion en Admin catalogo.
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
