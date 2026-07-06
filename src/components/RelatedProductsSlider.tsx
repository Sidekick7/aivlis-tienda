"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

type Props = {
  products: Product[];
};

export default function RelatedProductsSlider({ products }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    scrollLeft: 0,
    startX: 0,
  });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rubberBandX, setRubberBandX] = useState(0);

  const scrollSlider = (direction: -1 | 1) => {
    sliderRef.current?.scrollBy({
      left: direction * 310,
      behavior: "smooth",
    });
  };

  const stopDrag = (event?: PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;

    if (!dragState.active) return;

    if (
      event &&
      event.currentTarget.hasPointerCapture(dragState.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);
    }

    if (dragState.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragRef.current = {
      ...dragState,
      active: false,
      pointerId: -1,
    };
    setIsDragging(false);
    setRubberBandX(0);
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!sliderRef.current) return;

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setRubberBandX(0);
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      scrollLeft: sliderRef.current.scrollLeft,
      startX: event.clientX,
    };
  };

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    const dragState = dragRef.current;

    if (
      !dragState.active ||
      dragState.pointerId !== event.pointerId ||
      !sliderRef.current
    ) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragState.startX;
    const maxScrollLeft = Math.max(
      0,
      sliderRef.current.scrollWidth - sliderRef.current.clientWidth
    );
    const nextScrollLeft = dragState.scrollLeft - deltaX;
    const clampedScrollLeft = Math.min(
      Math.max(nextScrollLeft, 0),
      maxScrollLeft
    );
    const overflowX = nextScrollLeft - clampedScrollLeft;

    if (Math.abs(deltaX) > 3) {
      dragState.moved = true;
    }

    sliderRef.current.scrollLeft = clampedScrollLeft;
    setRubberBandX(Math.max(Math.min(-overflowX * 0.25, 22), -22));
  };

  return (
    <div className="relative">
      {products.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollSlider(-1)}
            className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-lg transition hover:bg-zinc-800 sm:-translate-x-4"
            aria-label="Ver productos anteriores"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => scrollSlider(1)}
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 translate-x-2 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-lg transition hover:bg-zinc-800 sm:translate-x-4"
            aria-label="Ver mas productos"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onDragStartCapture={(event) => event.preventDefault()}
        style={{
          transform: `translate3d(${rubberBandX}px, 0, 0)`,
          transition: isDragging
            ? "none"
            : "transform 220ms cubic-bezier(.2,.8,.2,1)",
        }}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;

          event.preventDefault();
          event.stopPropagation();
        }}
        className={`flex touch-pan-y select-none gap-4 overflow-x-auto pb-4 pl-1 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&_*]:select-none [&_a]:cursor-grab [&_img]:pointer-events-none [&::-webkit-scrollbar]:hidden ${
          isDragging
            ? "cursor-grabbing [&_a]:cursor-grabbing"
            : "cursor-grab"
        }`}
      >
        {products.map((product) => (
          <div
            key={product.slug}
            className="w-[62vw] max-w-[245px] shrink-0 sm:w-[260px] sm:max-w-none lg:w-[285px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
