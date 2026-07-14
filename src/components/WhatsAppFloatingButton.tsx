"use client";

import { useEffect, useState } from "react";
import {
  fallbackHomeContent,
  getHomeContent,
} from "@/lib/homeContent";
import {
  buildDirectWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

const whatsappMessage = "Hola, quiero hacer una consulta.";

export default function WhatsAppFloatingButton() {
  const [whatsappNumber, setWhatsappNumber] = useState(
    fallbackHomeContent.socialLinks.whatsappNumber
  );

  useEffect(() => {
    getHomeContent()
      .then((content) =>
        setWhatsappNumber(content.socialLinks.whatsappNumber)
      )
      .catch(() => {});
  }, []);

  if (!normalizeWhatsAppNumber(whatsappNumber)) return null;

  const whatsappUrl = buildDirectWhatsAppUrl({
    number: whatsappNumber,
    message: whatsappMessage,
  });

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-40 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#20bd5a] sm:bottom-24 sm:right-6"
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="h-12 w-12"
      >
        <path
          fill="currentColor"
          d="M16.01 3.2A12.67 12.67 0 0 0 5.2 22.48L3.7 28.8l6.46-1.45A12.67 12.67 0 1 0 16.01 3.2Zm0 22.94c-1.9 0-3.74-.52-5.34-1.5l-.38-.23-3.84.86.9-3.74-.25-.39a10.25 10.25 0 1 1 8.91 5Zm5.62-7.68c-.31-.16-1.83-.9-2.12-1-.28-.1-.49-.16-.7.16-.2.3-.8 1-.98 1.18-.18.2-.36.22-.67.07-.31-.16-1.31-.48-2.5-1.54a9.36 9.36 0 0 1-1.72-2.15c-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.54.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.09 1.06-1.09 2.58 0 1.52 1.11 2.99 1.27 3.2.16.2 2.18 3.33 5.28 4.67.74.32 1.31.51 1.76.65.74.24 1.41.2 1.94.12.59-.09 1.83-.75 2.09-1.47.26-.72.26-1.34.18-1.47-.08-.13-.28-.2-.59-.36Z"
        />
      </svg>
    </a>
  );
}
