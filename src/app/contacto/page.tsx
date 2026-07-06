import {
  Camera,
  MapPin,
  MessageCircle,
  Music2,
} from "lucide-react";
import Link from "next/link";
import { getHomeContent } from "@/lib/homeContent";

export default async function ContactPage() {
  const { socialLinks } = await getHomeContent();
  const contactOptions = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      detail: socialLinks.whatsappNumber || "a definir",
      description:
        "Para consultas por productos, talles, stock, pedidos, pagos y comprobantes.",
      href: socialLinks.whatsappNumber
        ? `https://wa.me/${socialLinks.whatsappNumber}`
        : "#",
      buttonLabel: "Escribir",
      external: true,
    },
    {
      icon: Camera,
      title: "Instagram",
      detail: socialLinks.instagramLabel,
      description:
        "Novedades, productos, historias y consultas rapidas.",
      href: socialLinks.instagramUrl,
      buttonLabel: "Ver Instagram",
      external: true,
    },
    {
      icon: Music2,
      title: "TikTok",
      detail: socialLinks.tiktokLabel,
      description:
        "Contenido, videos de prendas y novedades de la marca.",
      href: socialLinks.tiktokUrl,
      buttonLabel: "Ver TikTok",
      external: true,
    },
    {
      icon: MapPin,
      title: "Showroom",
      detail: socialLinks.showroomAddress,
      description:
        "Retiro de pedidos, consultas de disponibilidad y prueba de camperas.",
      href: "/local",
      buttonLabel: "Ver local",
      external: false,
    },
  ];

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-10 pt-5 md:px-10 lg:pb-12 lg:pt-7">
        <div className="max-w-3xl">
          <p className="font-brand mb-3 text-base uppercase text-zinc-500">
            Atencion
          </p>

          <h1 className="font-brand text-5xl md:text-6xl">
            Contacto
          </h1>

          <p className="mt-5 max-w-2xl text-zinc-600">
            Escribinos para resolver dudas antes de comprar, consultar
            disponibilidad, coordinar envios, retiro o pagos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactOptions.map((option) => {
            const Icon = option.icon;
            const cardContent = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                  <Icon size={20} />
                </span>

                <div className="mt-5">
                  <h2 className="font-brand text-2xl">
                    {option.title}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    {option.detail}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                    {option.description}
                  </p>
                </div>

                <span className="font-brand mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-100 px-5 text-base text-zinc-800 transition group-hover:bg-black group-hover:text-white">
                  {option.buttonLabel}
                </span>
              </>
            );

            if (option.external) {
              return (
                <a
                  key={option.title}
                  href={option.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400"
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link
                key={option.title}
                href={option.href}
                className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-brand text-2xl">
            Antes de escribirnos
          </h2>

          <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-600 md:grid-cols-3">
            <p className="rounded-xl bg-zinc-100 px-4 py-3">
              Para stock puntual, envianos producto, talle y color.
            </p>

            <p className="rounded-xl bg-zinc-100 px-4 py-3">
              Para un pedido ya creado, envianos el numero de pedido.
            </p>

            <p className="rounded-xl bg-zinc-100 px-4 py-3">
              Para retirar, coordinamos horario por WhatsApp.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
