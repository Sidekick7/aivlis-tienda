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
      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-8 pt-4 md:px-10 lg:grid-cols-[minmax(0,520px)_1fr] lg:items-stretch lg:pb-10 lg:pt-5">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm lg:h-full">
          <Image
            src="/showroom-door.png"
            alt="Puerta del showroom AIVLIS"
            width={962}
            height={1357}
            priority
            sizes="(min-width: 1024px) 540px, 100vw"
            className="h-auto w-full object-cover lg:h-full"
          />
        </div>

        <div className="flex flex-col gap-3 lg:h-full">
          <div>
            <p className="font-brand mb-2 text-lg uppercase text-zinc-500">
              Showroom
            </p>

            <h1 className="font-brand text-5xl leading-none md:text-7xl">
              AIVLIS
            </h1>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <MapPin size={20} />
              </span>

              <div>
                <p className="font-brand text-lg uppercase text-zinc-500">
                  Direccion
                </p>
                <h2 className="font-brand mt-1 text-3xl leading-none md:text-4xl">
                  {showroomAddress}
                </h2>
                <p className="mt-2 text-base font-semibold text-zinc-500">
                  Flores / zona Avellaneda comercial
                </p>
              </div>
            </div>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            {localDetails.map((detail) => {
              const Icon = detail.icon;

              return (
                <article
                  key={detail.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <Icon
                    size={23}
                    className="text-zinc-500"
                  />

                  <h2 className="font-brand mt-3 text-3xl leading-none">
                    {detail.title}
                  </h2>

                  <p className="mt-2 whitespace-pre-line text-base font-semibold leading-6 text-zinc-600">
                    {detail.body}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-white p-4">
              <Package
                size={23}
                className="text-zinc-500"
              />

              <h2 className="font-brand mt-3 text-3xl leading-none">
                Retiro de pedidos
              </h2>

              <p className="mt-2 text-base font-semibold leading-6 text-zinc-600">
                Despues de enviar el pedido por WhatsApp, coordinamos dia y
                horario de retiro.
              </p>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="font-brand text-3xl leading-none">
                Antes de venir
              </h2>

              <p className="mt-2 text-base font-semibold leading-6 text-zinc-600">
                Si buscas un talle o color puntual, escribinos antes para
                confirmar disponibilidad.
              </p>

              <Link
                href="/tienda"
                className="font-brand mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-lg text-zinc-800 transition hover:bg-zinc-200"
              >
                Ver productos
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 md:px-10">
        <div className="grid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-[.9fr_1.35fr]">
          <div className="border-b border-zinc-100 p-4 lg:border-b-0 lg:border-r">
            <p className="font-brand text-lg uppercase text-zinc-500">
              Ubicacion
            </p>

            <h2 className="font-brand mt-1 text-3xl leading-none md:text-4xl">
              Como llegar al showroom
            </h2>

            <p className="mt-2 text-base font-semibold leading-6 text-zinc-600">
              Estamos en {showroomAddress}, dentro de la zona comercial
              de Av. Avellaneda.
            </p>

            <div className="mt-4 grid gap-2 text-base font-semibold leading-6 text-zinc-700">
              <p className="rounded-xl bg-zinc-100 px-4 py-3">
                A 2 cuadras de estacion San Pedrito.
              </p>
              <p className="rounded-xl bg-zinc-100 px-4 py-3">
                A 2 cuadras de Av. Nazca y Av. Avellaneda.
              </p>
              <p className="rounded-xl bg-zinc-100 px-4 py-3">
                A 1 cuadra de Av. Rivadavia.
              </p>
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
            className="h-[300px] w-full border-0 md:h-[380px]"
          />
        </div>
      </section>
    </main>
  );
}
