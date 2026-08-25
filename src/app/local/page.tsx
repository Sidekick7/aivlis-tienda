import {
  Clock,
  MapPin,
  Package,
  RefreshCw,
  Shirt,
  TrainFront,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getHomeContent } from "@/lib/homeContent";

const localDetails = [
  {
    icon: Clock,
    title: "Horarios",
    body: "Lunes a viernes: 08:00 a 17:00 hs.\nSabados: 08:00 a 13:00 hs.",
  },
  {
    icon: TrainFront,
    title: "Zona comercial",
    body: "En zona comercial de Flores, cerca de Av. Avellaneda, Av. Nazca y Av. Rivadavia.",
  },
  {
    icon: Shirt,
    title: "Prueba de camperas",
    body: "Podes probar camperas en el showroom. Para talles o colores puntuales, consultanos antes de venir.",
  },
  {
    icon: RefreshCw,
    title: "Cambios por talle",
    body: "Cambios dentro de los 7 dias por talle, sujetos a stock disponible.",
  },
];

export default async function LocalPage() {
  const { socialLinks } = await getHomeContent();
  const showroomAddress = socialLinks.showroomAddress;

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-8 md:pt-8">
        <header className="mb-5 border-b border-zinc-300 pb-4">
          <p className="font-brand text-base uppercase text-zinc-500">
            Showroom
          </p>
          <h1 className="font-brand mt-1 text-4xl leading-none md:text-5xl">
            AIVLIS
          </h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
          <div className="overflow-hidden rounded-lg bg-zinc-200">
            <Image
              src="/showroom-door.png"
              alt="Puerta del showroom AIVLIS"
              width={962}
              height={1357}
              priority
              sizes="(min-width: 1024px) 340px, 100vw"
              className="h-[340px] w-full object-cover sm:h-[420px] lg:h-[480px]"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-start gap-3 border-b border-zinc-300 pb-5">
              <MapPin size={21} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Direccion
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">
                  {showroomAddress}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Flores / zona Avellaneda comercial
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-300">
              {localDetails.map((detail) => {
                const Icon = detail.icon;

                return (
                  <article
                    key={detail.title}
                    className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:gap-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={18} className="shrink-0 text-zinc-500" />
                      <h2 className="text-base font-bold">{detail.title}</h2>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6 text-zinc-600">
                      {detail.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-7 grid border-y border-zinc-300 sm:grid-cols-2">
          <article className="py-5 sm:pr-7">
            <div className="flex items-center gap-2.5">
              <Package size={19} className="text-zinc-500" />
              <h2 className="text-lg font-bold">Retiro de pedidos</h2>
            </div>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Despues de enviar el pedido por WhatsApp, coordinamos dia y
              horario de retiro.
            </p>
          </article>

          <article className="border-t border-zinc-300 py-5 sm:border-l sm:border-t-0 sm:pl-7">
            <h2 className="text-lg font-bold">Antes de venir</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Si buscas un talle o color puntual, escribinos antes para
              confirmar disponibilidad.
            </p>
            <Link
              href="/tienda"
              className="mt-3 inline-flex h-9 items-center justify-center bg-black px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Ver productos
            </Link>
          </article>
        </div>
      </section>

      <section className="border-t border-zinc-300 bg-white">
        <div className="mx-auto grid max-w-6xl md:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
          <div className="px-5 py-7 md:px-8 md:py-8">
            <p className="text-xs font-bold uppercase text-zinc-500">
              Ubicacion
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Como llegar al showroom
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Estamos en {showroomAddress}, dentro de la zona comercial de Av.
              Avellaneda.
            </p>

            <div className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200 text-sm text-zinc-700">
              <p className="py-2.5">A 2 cuadras de estacion San Pedrito.</p>
              <p className="py-2.5">
                A 2 cuadras de Av. Nazca y Av. Avellaneda.
              </p>
              <p className="py-2.5">A 1 cuadra de Av. Rivadavia.</p>
            </div>
          </div>

          <iframe
            title="Mapa de AIVLIS showroom"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3282.9559332517665!2d-58.4750639129112!3d-34.63055387205011!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc98e23482bb3%3A0xe7b9ee0b583c40b5!2sYerbal%203160%2C%20C1406GKR%20Cdad.%20Aut%C3%B3noma%20de%20Buenos%20Aires!5e0!3m2!1ses!2sar!4v1780358858478!5m2!1ses!2sar"
            width="600"
            height="450"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[300px] w-full border-0 md:h-full md:min-h-[340px]"
          />
        </div>
      </section>
    </main>
  );
}
