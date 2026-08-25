import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { getHomeContent } from "@/lib/homeContent";
import {
  buildDirectWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path
        fill="currentColor"
        d="M16.01 3.2A12.67 12.67 0 0 0 5.2 22.48L3.7 28.8l6.46-1.45A12.67 12.67 0 1 0 16.01 3.2Zm0 22.94c-1.9 0-3.74-.52-5.34-1.5l-.38-.23-3.84.86.9-3.74-.25-.39a10.25 10.25 0 1 1 8.91 5Zm5.62-7.68c-.31-.16-1.83-.9-2.12-1-.28-.1-.49-.16-.7.16-.2.3-.8 1-.98 1.18-.18.2-.36.22-.67.07-.31-.16-1.31-.48-2.5-1.54a9.36 9.36 0 0 1-1.72-2.15c-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.54.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.09 1.06-1.09 2.58 0 1.52 1.11 2.99 1.27 3.2.16.2 2.18 3.33 5.28 4.67.74.32 1.31.51 1.76.65.74.24 1.41.2 1.94.12.59-.09 1.83-.75 2.09-1.47.26-.72.26-1.34.18-1.47-.08-.13-.28-.2-.59-.36Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path
        fill="currentColor"
        d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7.35A4.65 4.65 0 1 1 12 16.65 4.65 4.65 0 0 1 12 7.35Zm0 2A2.65 2.65 0 1 0 12 14.65 2.65 2.65 0 0 0 12 9.35ZM17.15 6.65a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path
        fill="currentColor"
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.77l-.44 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path
        fill="currentColor"
        d="M16.6 2c.27 2.28 1.56 3.63 3.74 3.78v3.06a7.13 7.13 0 0 1-3.7-.97v6.98c0 3.54-2.23 6.05-5.7 6.05-3.25 0-5.28-2.18-5.28-5.1 0-3.28 2.55-5.6 6.35-5.33v3.14c-1.67-.25-3.08.56-3.08 2.05 0 1.2.84 2.02 2.02 2.02 1.37 0 2.33-.83 2.33-2.64V2h3.32Z"
      />
    </svg>
  );
}

export default async function ContactPage() {
  const { socialLinks } = await getHomeContent();
  const normalizedWhatsappNumber = normalizeWhatsAppNumber(
    socialLinks.whatsappNumber
  );
  const contactOptions = [
    {
      icon: WhatsAppIcon,
      title: "WhatsApp",
      detail: socialLinks.whatsappNumber || "a definir",
      href: buildDirectWhatsAppUrl({
        number: socialLinks.whatsappNumber,
      }),
      buttonLabel: "Escribir",
      external: Boolean(normalizedWhatsappNumber),
    },
    {
      icon: InstagramIcon,
      title: "Instagram",
      detail: socialLinks.instagramLabel,
      href: socialLinks.instagramUrl,
      buttonLabel: "Instagram",
      external: true,
    },
    {
      icon: FacebookIcon,
      title: "Facebook",
      detail: socialLinks.facebookLabel,
      href: socialLinks.facebookUrl,
      buttonLabel: "Facebook",
      external: true,
    },
    {
      icon: TikTokIcon,
      title: "TikTok",
      detail: socialLinks.tiktokLabel,
      href: socialLinks.tiktokUrl,
      buttonLabel: "TikTok",
      external: true,
    },
    {
      icon: MapPin,
      title: "Showroom",
      detail: socialLinks.showroomAddress,
      href: "/local",
      buttonLabel: "Ver local",
      external: false,
    },
  ];

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-8 md:pt-8">
        <header className="mb-6 border-b border-zinc-300 pb-4">
          <p className="font-brand text-base uppercase text-zinc-500">
            Canales
          </p>
          <h1 className="font-brand mt-1 text-4xl leading-none md:text-5xl">
            Contacto
          </h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <section>
            <h2 className="text-xs font-bold uppercase text-zinc-500">
              Contacto directo
            </h2>

            <div className="mt-3 divide-y divide-zinc-300 border-y border-zinc-300">
              {contactOptions.map((option) => {
                const Icon = option.icon;
                const rowContent = (
                  <>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
                      <Icon />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold">
                        {option.title}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-zinc-600">
                        {option.detail || "-"}
                      </span>
                    </span>

                    <span className="hidden text-sm font-bold sm:block">
                      {option.buttonLabel}
                    </span>
                    <ArrowUpRight
                      size={18}
                      className="shrink-0 text-zinc-500 transition group-hover:text-black"
                    />
                  </>
                );

                if (option.external) {
                  return (
                    <a
                      key={option.title}
                      href={option.href || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex min-h-20 cursor-pointer items-center gap-4 py-3.5"
                    >
                      {rowContent}
                    </a>
                  );
                }

                return (
                  <Link
                    key={option.title}
                    href={option.href}
                    className="group flex min-h-20 cursor-pointer items-center gap-4 py-3.5"
                  >
                    {rowContent}
                  </Link>
                );
              })}
            </div>
          </section>

          <aside className="border-y border-zinc-300 py-5 lg:border-l lg:border-y-0 lg:py-0 lg:pl-8">
            <div className="flex items-center gap-2.5">
              <Clock size={19} className="text-zinc-500" />
              <h2 className="text-lg font-bold">Horarios</h2>
            </div>

            <div className="mt-4 divide-y divide-zinc-300 text-sm leading-6 text-zinc-600">
              <p className="pb-3">
                <span className="block font-bold text-black">Lunes a viernes</span>
                08:00 a 17:00 hs.
              </p>
              <p className="pt-3">
                <span className="block font-bold text-black">Sabados</span>
                08:00 a 13:00 hs.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
