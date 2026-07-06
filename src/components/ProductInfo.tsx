"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Barcode,
  CheckCircle,
  Tag,
} from "lucide-react";
import { fallbackProductImage } from "@/config/store";
import { useCart } from "@/context/CartContext";
import { getCategories } from "@/lib/categories";
import {
  getCurveLabel,
  getCurveSizesFromVariant,
  getCurveStockLimit,
  getCurveUnitsPerSet,
  isCurveProduct,
} from "@/lib/curve";
import { formatPrice } from "@/lib/pricing";
import type { Product, ProductVariant } from "@/types/product";

type Props = {
  product: Product;
  displayName?: string;
  displayCategoryLabel?: string;
  initialPurchaseMode?: "unit" | "curve";
  lockPurchaseMode?: boolean;
};

function getDefaultSize(variant?: ProductVariant) {
  return (
    variant?.sizes.find((sizeItem) => sizeItem.stock > 0)?.size ||
    variant?.sizes[0]?.size ||
    ""
  );
}

function getDisplaySku(product: Product) {
  const sku = product.sku || product.slug;

  return sku.startsWith("AIV-") ? sku.replace("AIV-", "") : sku;
}

const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function sortSizes(sizes: string[]) {
  return [...sizes].sort((firstSize, secondSize) => {
    const firstIndex = sizeOrder.indexOf(firstSize.toUpperCase());
    const secondIndex = sizeOrder.indexOf(secondSize.toUpperCase());

    if (firstIndex !== -1 || secondIndex !== -1) {
      return (
        (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex) -
        (secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex)
      );
    }

    return firstSize.localeCompare(secondSize, "es", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export default function ProductInfo({
  product,
  displayName,
  displayCategoryLabel,
  initialPurchaseMode = "unit",
  lockPurchaseMode = false,
}: Props) {
  const productDisplayName = displayName ?? product.name;
  const [categoryLabel, setCategoryLabel] = useState(product.category);
  const firstVariant = product.variants[0];
  const firstImage =
    firstVariant?.images[0] ||
    product.images[0] ||
    fallbackProductImage;
  const thumbnails = [
    ...product.variants.flatMap((variant) =>
      variant.images.map((image) => ({
        image,
        variant,
      }))
    ),
    ...product.images.map((image) => ({
      image,
      variant: null,
    })),
  ].filter(
    (thumbnail, index, allThumbnails) =>
      allThumbnails.findIndex(
        (item) => item.image === thumbnail.image
      ) === index
  );

  const [selectedSize, setSelectedSize] = useState(
    getDefaultSize(firstVariant)
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    firstVariant?.color || ""
  );
  const [selectedImage, setSelectedImage] = useState(
    firstImage
  );
  const [purchaseMode, setPurchaseMode] = useState<"unit" | "curve">(
    initialPurchaseMode
  );
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [zoomPosition, setZoomPosition] = useState({
    x: 50,
    y: 50,
  });
  const [thumbnailRubberBand, setThumbnailRubberBand] = useState({
    x: 0,
    y: 0,
  });
  const [isThumbnailDragging, setIsThumbnailDragging] = useState(false);
  const thumbnailListRef = useRef<HTMLDivElement>(null);
  const thumbnailDragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    thumbnailIndex: null as number | null,
    scrollLeft: 0,
    scrollTop: 0,
    startX: 0,
    startY: 0,
  });
  const suppressThumbnailClickRef = useRef(false);

  const { addToCart, cart } = useCart();

  useEffect(() => {
    if (displayCategoryLabel) {
      return;
    }

    getCategories().then((categories) => {
      setCategoryLabel(
        categories.find(
          (category) => category.value === product.category
        )?.label ?? product.category
      );
    });
  }, [displayCategoryLabel, product.category]);

  const selectedVariant =
    product.variants.find(
      (variant) => variant.color === selectedColor
    ) || firstVariant;
  const canBuyCurve = isCurveProduct(product);
  const canSwitchPurchaseMode = canBuyCurve && !lockPurchaseMode;
  const isCurveSale = canBuyCurve && purchaseMode === "curve";
  const currentCategoryLabel = displayCategoryLabel ?? categoryLabel;
  const curveStockLimit = canBuyCurve
    ? getCurveStockLimit({
        variant: selectedVariant,
      })
    : 0;
  const curveUnitsPerSet = canBuyCurve
    ? getCurveUnitsPerSet(selectedVariant)
    : 1;
  const unitReferencePrice = product.price;
  const curveUnitPrice =
    canBuyCurve && product.curvePrice > 0
      ? product.curvePrice
      : product.price;
  const curveSetPrice = curveUnitPrice * curveUnitsPerSet;
  const curveReferenceTotal = unitReferencePrice * curveUnitsPerSet;
  const curveSavings = Math.max(
    curveReferenceTotal - curveSetPrice,
    0
  );
  const visiblePrice = isCurveSale
    ? curveSetPrice
    : unitReferencePrice;
  const curveLabel = canBuyCurve ? getCurveLabel(selectedVariant) : "";
  const curveSizes = getCurveSizesFromVariant(selectedVariant);
  const allProductSizes = sortSizes(
    Array.from(
      new Set(
        product.variants.flatMap((variant) =>
          variant.sizes.map((sizeItem) => sizeItem.size)
        )
      )
    )
  );

  const selectedSizeData =
    selectedVariant?.sizes.find(
      (item) => item.size === selectedSize
    );
  const stockLimit = selectedSizeData?.stock || 0;
  const quantityAlreadyInCart = cart
    .filter(
      (item) =>
        item.id === product.id &&
        item.saleMode === (isCurveSale ? "curve" : "unit") &&
        item.size === (isCurveSale ? curveLabel : selectedSize) &&
        item.selectedColor === selectedColor
    )
    .reduce((total, item) => total + item.quantity, 0);
  const effectiveStockLimit = isCurveSale
    ? curveStockLimit
    : stockLimit;
  const availableToAdd = Math.max(
    effectiveStockLimit - quantityAlreadyInCart,
    0
  );
  const maxQuantityToSelect =
    availableToAdd > 0 ? availableToAdd : 1;
  const selectedQuantity = Math.min(
    Math.max(quantity, 1),
    maxQuantityToSelect
  );
  const resetCartFeedback = () => {
    setCartMessage("");
    setCartError("");
    setQuantity(1);
  };

  const selectThumbnail = (index: number) => {
    const thumbnail = thumbnails[index];

    if (!thumbnail) return;

    resetCartFeedback();
    setSelectedImage(thumbnail.image);

    if (thumbnail.variant) {
      setSelectedColor(thumbnail.variant.color);
      setSelectedSize(getDefaultSize(thumbnail.variant));
    }
  };

  const scrollThumbnails = (direction: -1 | 1) => {
    thumbnailListRef.current?.scrollBy({
      top: direction * 145,
      left: direction * 92,
      behavior: "smooth",
    });
  };

  const stopThumbnailDrag = (
    event?: PointerEvent<HTMLDivElement>
  ) => {
    const dragState = thumbnailDragRef.current;

    if (!dragState.active) return;

    if (
      event &&
      event.currentTarget.hasPointerCapture(dragState.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);
    }

    if (dragState.moved) {
      suppressThumbnailClickRef.current = true;
      window.setTimeout(() => {
        suppressThumbnailClickRef.current = false;
      }, 0);
    } else if (
      event?.type === "pointerup" &&
      dragState.thumbnailIndex !== null
    ) {
      selectThumbnail(dragState.thumbnailIndex);
    }

    thumbnailDragRef.current = {
      ...dragState,
      active: false,
      pointerId: -1,
      thumbnailIndex: null,
    };
    setIsThumbnailDragging(false);
    setThumbnailRubberBand({
      x: 0,
      y: 0,
    });
  };

  const handleThumbnailPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!thumbnailListRef.current) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const thumbnailButton = (event.target as Element | null)?.closest(
      "[data-thumbnail-index]"
    );
    const thumbnailIndex = thumbnailButton
      ? Number(thumbnailButton.getAttribute("data-thumbnail-index"))
      : null;

    setIsThumbnailDragging(true);
    setThumbnailRubberBand({
      x: 0,
      y: 0,
    });

    thumbnailDragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      thumbnailIndex: typeof thumbnailIndex === "number"
        ? thumbnailIndex
        : null,
      scrollLeft: thumbnailListRef.current.scrollLeft,
      scrollTop: thumbnailListRef.current.scrollTop,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleThumbnailPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    const dragState = thumbnailDragRef.current;

    if (
      !dragState.active ||
      dragState.pointerId !== event.pointerId ||
      !thumbnailListRef.current
    ) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const maxScrollLeft = Math.max(
      0,
      thumbnailListRef.current.scrollWidth -
        thumbnailListRef.current.clientWidth
    );
    const maxScrollTop = Math.max(
      0,
      thumbnailListRef.current.scrollHeight -
        thumbnailListRef.current.clientHeight
    );
    const nextScrollLeft = dragState.scrollLeft - deltaX;
    const nextScrollTop = dragState.scrollTop - deltaY;
    const clampedScrollLeft = Math.min(
      Math.max(nextScrollLeft, 0),
      maxScrollLeft
    );
    const clampedScrollTop = Math.min(
      Math.max(nextScrollTop, 0),
      maxScrollTop
    );
    const overflowX = nextScrollLeft - clampedScrollLeft;
    const overflowY = nextScrollTop - clampedScrollTop;
    const isDesktopThumbnailLayout =
      window.matchMedia("(min-width: 768px)").matches;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragState.moved = true;
    }

    thumbnailListRef.current.scrollLeft = clampedScrollLeft;
    thumbnailListRef.current.scrollTop = clampedScrollTop;
    setThumbnailRubberBand({
      x: isDesktopThumbnailLayout
        ? 0
        : Math.max(Math.min(-overflowX * 0.28, 18), -18),
      y: isDesktopThumbnailLayout
        ? Math.max(Math.min(-overflowY * 0.28, 24), -24)
        : 0,
    });
  };

  const handleAddToCart = () => {
    setCartMessage("");
    setCartError("");

    if (isCurveSale) {
      if (!selectedVariant || curveStockLimit <= 0) {
        setCartError("Este producto no tiene curvas disponibles.");
        return;
      }

      if (availableToAdd <= 0) {
        setCartError(
          "Ya agregaste todo el stock disponible al carrito."
        );
        return;
      }

      addToCart(
        {
          ...product,
          saleMode: "curve",
          price: curveUnitPrice,
          retailPrice: curveUnitPrice,
          selectedImage: selectedImage || fallbackProductImage,
          selectedColor,
        },
        undefined,
        selectedQuantity
      );

      setCartMessage(
        `${selectedQuantity} ${
          selectedQuantity === 1 ? "curva agregada" : "curvas agregadas"
        } al carrito.`
      );
      return;
    }

    if (!selectedVariant || !selectedSizeData) {
      setCartError("Este producto no tiene stock disponible.");
      return;
    }

    if (availableToAdd <= 0) {
      setCartError(
        "Ya agregaste todo el stock disponible al carrito."
      );
      return;
    }

    if (selectedQuantity > availableToAdd) {
      setQuantity(availableToAdd);
      setCartError(
        `Solo quedan ${availableToAdd} disponibles para agregar.`
      );
      return;
    }

    addToCart(
      {
        ...product,
        saleMode: "unit",
        price: unitReferencePrice,
        retailPrice: unitReferencePrice,
        selectedImage: selectedImage || fallbackProductImage,
        selectedColor,
      },
      selectedSize,
      selectedQuantity
    );

    setCartMessage(
      `${selectedQuantity} ${
        selectedQuantity === 1 ? "unidad agregada" : "unidades agregadas"
      } al carrito.`
    );
  };

  return (

    <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[92px_minmax(0,1fr)] md:items-start md:gap-4">
          <div className="order-2 md:order-1">
            <div className="flex items-center gap-2 md:block">
              {thumbnails.length > 1 && (
                <button
                  type="button"
                  onClick={() => scrollThumbnails(-1)}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-sm transition hover:bg-zinc-100 md:hidden"
                  aria-label="Ver miniaturas anteriores"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <div
                ref={thumbnailListRef}
                onPointerDown={handleThumbnailPointerDown}
                onPointerMove={handleThumbnailPointerMove}
                onPointerUp={stopThumbnailDrag}
                onPointerCancel={stopThumbnailDrag}
                style={{
                  transform: `translate3d(${thumbnailRubberBand.x}px, ${thumbnailRubberBand.y}px, 0)`,
                  transition: isThumbnailDragging
                    ? "none"
                    : "transform 220ms cubic-bezier(.2,.8,.2,1)",
                }}
                className="flex flex-1 touch-none select-none gap-3 overflow-hidden [-ms-overflow-style:none] [scrollbar-width:none] md:max-h-[560px] md:cursor-grab md:flex-col md:active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
              >
              {thumbnails.map((thumbnail, index) => (

                <button
                  key={thumbnail.image}
                  data-thumbnail-index={index}
                  onClick={(event) => {
                    if (suppressThumbnailClickRef.current) {
                      event.preventDefault();
                      return;
                    }

                    selectThumbnail(index);
                  }}
                  className={`shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 ${
                    selectedImage === thumbnail.image
                      ? "ring-2 ring-black/70 scale-[1.02]"
                      : "opacity-75 hover:opacity-100 hover:scale-[1.02]"
                  }`}
                >

                  <Image
                    src={thumbnail.image}
                    alt=""
                    width={96}
                    height={128}
                    draggable={false}
                    className="h-28 w-20 rounded-2xl object-cover md:h-32 md:w-24"
                  />

                </button>

              ))}
              </div>

              {thumbnails.length > 1 && (
                <button
                  type="button"
                  onClick={() => scrollThumbnails(1)}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-sm transition hover:bg-zinc-100 md:hidden"
                  aria-label="Ver mas miniaturas"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {thumbnails.length > 1 && (
              <div className="hidden grid-cols-2 gap-2 md:grid">
                <button
                  type="button"
                  onClick={() => scrollThumbnails(-1)}
                  className="flex h-9 cursor-pointer items-center justify-center rounded-xl bg-white text-black transition hover:bg-zinc-200"
                  aria-label="Ver miniaturas anteriores"
                >
                  <ChevronUp size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => scrollThumbnails(1)}
                  className="flex h-9 cursor-pointer items-center justify-center rounded-xl bg-white text-black transition hover:bg-zinc-200"
                  aria-label="Ver mas miniaturas"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            )}
          </div>

          <div
            className="relative order-1 w-full overflow-hidden rounded-3xl md:order-2"
            onMouseMove={(e) => {

              const rect =
                e.currentTarget.getBoundingClientRect();

              const x =
                ((e.clientX - rect.left) / rect.width) * 100;

              const y =
                ((e.clientY - rect.top) / rect.height) * 100;

              setZoomPosition({ x, y });

            }}
          >
            <Image
              src={selectedImage || fallbackProductImage}
              alt={productDisplayName}
              width={700}
              height={800}
              className="aspect-[7/8] w-full object-cover transition-transform duration-300 md:hover:scale-150"
              style={{
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              }}
            />

          </div>
        </div>
      </div>
      <div className="lg:sticky lg:top-28">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/"
            className="cursor-pointer transition hover:text-black hover:underline"
          >
            Inicio
          </Link>

          <span>/</span>

          <Link
            href={`/tienda?categoria=${product.category}`}
            className="cursor-pointer uppercase transition hover:text-black hover:underline"
          >
            {currentCategoryLabel}
          </Link>

          <span>/</span>

          <span className="font-semibold uppercase text-black">
            {productDisplayName}
          </span>
        </div>

      <h1 className="font-brand text-3xl leading-none md:text-4xl">
        {productDisplayName}
      </h1>

      <div className="mt-3">
        <p className="text-2xl font-bold">
          {formatPrice(visiblePrice)}
        </p>

        {canBuyCurve && (
          <p className="mt-1 text-xs font-semibold uppercase text-zinc-500">
            {isCurveSale
              ? `${curveUnitsPerSet} prendas · ${formatPrice(
                  curveUnitPrice
                )} por prenda`
              : "Precio por unidad"}
          </p>
        )}

        {product.details.length > 0 && (
          <div className="mt-3">
            <ul className="space-y-0.5 pl-5 text-sm leading-5 text-black [list-style-type:square]">
              {product.details.map((detail) => (
                <li key={detail}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {(!isCurveSale && (!selectedSizeData ||
        selectedSizeData.stock <= 0) && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600">
            <AlertCircle size={16} />
            Agotado
          </div>
        ))}
      {isCurveSale && curveStockLimit <= 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600">
          <AlertCircle size={16} />
          Agotado
        </div>
      )}
      <div className="mt-5 space-y-4">
        {canSwitchPurchaseMode && (
          <div>
            <p className="font-brand mb-2 text-sm uppercase text-zinc-500">
              Modalidad
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  resetCartFeedback();
                  setPurchaseMode("unit");
                }}
                className={`h-9 min-w-20 rounded-xl border px-4 text-sm font-semibold transition ${
                  purchaseMode === "unit"
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 bg-zinc-50 hover:border-black"
                }`}
              >
                Unidad
              </button>

              <button
                type="button"
                onClick={() => {
                  resetCartFeedback();
                  setPurchaseMode("curve");
                }}
                disabled={curveStockLimit <= 0}
                className={`h-9 min-w-20 rounded-xl border px-4 text-sm font-semibold transition ${
                  purchaseMode === "curve"
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 bg-zinc-50 hover:border-black"
                } ${
                  curveStockLimit <= 0
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
              >
                Curva
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center gap-3">
            <p className="font-brand text-sm uppercase text-zinc-500">
              Color
            </p>

            {selectedColor && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {selectedColor}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.color}
                type="button"
                title={variant.color}
                aria-label={`Color ${variant.color}`}
                onClick={() => {
                  resetCartFeedback();
                  setSelectedColor(variant.color);
                  setSelectedImage(
                    variant.images[0] ||
                    product.images[0] ||
                    fallbackProductImage
                  );
                  setSelectedSize(
                    getDefaultSize(variant)
                  );
                }}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                  selectedColor === variant.color
                    ? "scale-110 border-black"
                    : "border-zinc-200 hover:border-black"
                }`}
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{
                    backgroundColor: variant.hex,
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {isCurveSale ? (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-brand text-sm uppercase text-zinc-500">
                Venta por curva
              </p>

              {curveStockLimit <= 3 && curveStockLimit > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                  <AlertCircle size={13} />
                  Ultimas curvas
                </span>
              )}
            </div>

            <p className="mt-1 text-base font-bold">
              {curveLabel}
            </p>

            <p className="mt-1 text-sm leading-5 text-zinc-600">
              1 unidad de cada talle del color. Total: {curveUnitsPerSet} prendas.
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Unidad suelta
                </p>
                <p className="text-base font-bold text-zinc-900">
                  {formatPrice(unitReferencePrice)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Curva completa
                </p>
                <p className="text-base font-bold text-zinc-900">
                  {formatPrice(curveSetPrice)}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">
                {formatPrice(curveUnitPrice)} por prenda
              </span>

              {curveSavings > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                  Ahorras {formatPrice(curveSavings)}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {curveSizes.map((size) => (
                <span
                  key={size}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                >
                  {size}
                </span>
              ))}
            </div>

          </div>
        ) : (
        <div>
          <div className="mb-2 flex items-center gap-3">
            <p className="font-brand text-sm uppercase text-zinc-500">
              Talle
            </p>

            {selectedSizeData &&
              selectedSizeData.stock > 0 &&
              selectedSizeData.stock <= 5 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                  <AlertCircle size={13} />
                  Ultimas unidades
                </span>
              )}
          </div>

          <div className="flex flex-wrap gap-2">
            {allProductSizes.map((size) => {
              const sizeItem = selectedVariant?.sizes.find(
                (item) => item.size === size
              );
              const isAvailable = Boolean(
                sizeItem && sizeItem.stock > 0
              );
              const isSelected = selectedSize === size;

              return (
                <span
                  key={size}
                  className="group relative inline-flex"
                >
                  <button
                    type="button"
                    title={isAvailable ? `Talle ${size}` : undefined}
                    aria-label={
                      isAvailable ? `Talle ${size}` : `Talle ${size} agotado`
                    }
                    onClick={() => {
                      resetCartFeedback();
                      setSelectedSize(size);
                    }}
                    disabled={!isAvailable}
                    className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-semibold transition ${
                      isAvailable && isSelected
                        ? "border-black bg-black text-white"
                        : "border-zinc-200 bg-zinc-50 hover:border-black"
                    } ${
                      isAvailable
                        ? "cursor-pointer"
                        : "cursor-not-allowed text-zinc-400 line-through opacity-60"
                    }`}
                  >
                    {size}
                  </button>

                  {!isAvailable && (
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                      Agotado
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
        )}

      </div>

      <div className="mt-5 w-full max-w-[350px] sm:max-w-[360px]">
        <div className="grid grid-cols-[112px_210px] items-center gap-2">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50">
            <button
              onClick={() =>
                setQuantity(
                  selectedQuantity > 1
                    ? selectedQuantity - 1
                    : 1
                )
              }
              className="flex h-full w-9 cursor-pointer items-center justify-center text-lg transition hover:bg-zinc-100"
            >
              -
            </button>

            <input
              type="number"
              min="1"
              max={availableToAdd || 1}
              value={selectedQuantity}
              onChange={(e) => {
                const nextQuantity = Math.floor(
                  Number(e.target.value)
                );
                const maxQuantity =
                  availableToAdd > 0 ? availableToAdd : 1;

                setQuantity(
                  Number.isFinite(nextQuantity)
                    ? Math.min(
                        Math.max(1, nextQuantity),
                        maxQuantity
                      )
                    : 1
                );
              }}
              className="w-10 bg-transparent text-center text-base font-semibold outline-none"
            />

            <button
              onClick={() =>
                setQuantity(
                  selectedQuantity < availableToAdd
                    ? selectedQuantity + 1
                    : selectedQuantity
                )
              }
              disabled={
                availableToAdd <= 0 ||
                selectedQuantity >= availableToAdd
              }
              className="flex h-full w-9 cursor-pointer items-center justify-center text-lg transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={
              (!isCurveSale &&
                (!selectedSizeData || selectedSizeData.stock <= 0)) ||
              (isCurveSale && curveStockLimit <= 0) ||
              availableToAdd <= 0
            }
            className={`h-11 whitespace-nowrap rounded-xl px-2 text-xs font-semibold tracking-wide transition sm:text-sm ${
              (!isCurveSale && (!selectedSizeData ||
              selectedSizeData.stock <= 0)) ||
              (isCurveSale && curveStockLimit <= 0) ||
              availableToAdd <= 0
                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-zinc-800 cursor-pointer"
            }`}
          >
            <span className="sm:hidden">
              {isCurveSale && curveStockLimit <= 0
                ? "AGOTADO"
                : !isCurveSale &&
                  (!selectedSizeData || selectedSizeData.stock <= 0)
                ? "AGOTADO"
                : availableToAdd <= 0
                ? "EN CARRITO"
                : isCurveSale
                ? "AGREGAR CURVA"
                : "AGREGAR"}
            </span>
            <span className="hidden sm:inline">
              {isCurveSale && curveStockLimit <= 0
                ? "AGOTADO"
                : !isCurveSale &&
                  (!selectedSizeData || selectedSizeData.stock <= 0)
                ? "AGOTADO"
                : availableToAdd <= 0
                ? "STOCK EN CARRITO"
                : isCurveSale
                ? "AGREGAR CURVA AL CARRITO"
                : "AGREGAR AL CARRITO"}
            </span>
          </button>
        </div>

        <div className="mt-2 min-h-[68px] space-y-1.5">
          <p className="min-h-4 text-xs font-semibold text-zinc-500">
            {quantityAlreadyInCart > 0 && availableToAdd > 0
              ? `Ya tenes ${quantityAlreadyInCart} en carrito para este ${
                  isCurveSale ? "color y curva" : "talle/color"
                }.`
              : ""}
          </p>

          {cartError ? (
            <div className="flex min-h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              <AlertCircle
                size={14}
                className="shrink-0"
              />
              <span>{cartError}</span>
            </div>
          ) : cartMessage ? (
            <div className="flex min-h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle
                size={14}
                className="shrink-0"
              />
              <span>{cartMessage}</span>
            </div>
          ) : null}
        </div>
      </div>


          <div className="mt-6">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <Barcode size={14} />
                SKU {getDisplaySku(product)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <Tag size={14} />
                {currentCategoryLabel}
              </span>
            </div>
          </div>

          </div>

  </div> 
  );
}
