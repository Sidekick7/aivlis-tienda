import {
  Camera,
  MapPin,
  MessageCircle,
  Music2,
} from "lucide-react";
import Link from "next/link";

const contactOptions = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    detail: "+54 9 11 6451-3813",
    description:
      "Para consultas por productos, talles, stock, pedidos, pagos y comprobantes.",
    href: "https://wa.me/5491164513813",
    buttonLabel: "Escribir",
    external: true,
  },
  {
    icon: Camera,
    title: "Instagram",
    detail: "@aivlis.ind",
    description:
      "Novedades, productos, historias y consultas rapidas.",
    href: "https://www.instagram.com/aivlis.ind",
    buttonLabel: "Ver Instagram",
    external: true,
  },
  {
    icon: Music2,
    title: "TikTok",
    detail: "@aivlis.ind",
    description:
      "Contenido, videos de prendas y novedades de la marca.",
    href: "https://www.tiktok.com/@aivlis.ind",
    buttonLabel: "Ver TikTok",
    external: true,
  },
  {
    icon: MapPin,
    title: "Showroom",
    detail: "Yerbal 3160 - Flores",
    description:
      "Retiro de pedidos, consultas de disponibilidad y prueba de camperas.",
    href: "/local",
    buttonLabel: "Ver local",
    external: false,
  },
];

export default function ContactPage() {
  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-10 pt-5 md:px-10 lg:pb-12 lg:pt-7">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Atencion
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
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
                  <h2 className="text-lg font-bold">
                    {option.title}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    {option.detail}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                    {option.description}
                  </p>
                </div>

                <span className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-100 px-5 text-sm font-semibold text-zinc-800 transition group-hover:bg-black group-hover:text-white">
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
          <h2 className="text-lg font-bold">
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
