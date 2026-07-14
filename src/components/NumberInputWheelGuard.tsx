"use client";

import { useEffect } from "react";

export default function NumberInputWheelGuard() {
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const target = event.target;

      if (target instanceof HTMLInputElement && target.type === "number") {
        target.blur();
      }
    };

    document.addEventListener("wheel", handleWheel, true);

    return () => document.removeEventListener("wheel", handleWheel, true);
  }, []);

  return null;
}
