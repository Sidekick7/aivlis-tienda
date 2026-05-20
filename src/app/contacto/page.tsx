import Link from "next/link";

const contactOptions = [
  {
    title: "WhatsApp",
    description:
      "Para consultas por productos, talles, stock o pedidos ya cargados.",
  },
  {
    title: "Instagram",
    description:
      "Para novedades, lanzamientos y consultas rapidas.",
  },
  {
    title: "Pedidos",
    description:
      "Arma el carrito en la web y envia el detalle por WhatsApp para coordinar pago y entrega.",
  },
];

export default function ContactPage() {
  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14 md:px-10">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Atencion
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Contacto
          </h1>

          <p className="mt-5 max-w-2xl text-zinc-600">
            Escribinos para resolver dudas antes de comprar, coordinar
            envios, retiro en local o consultar por un pedido.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {contactOptions.map((option) => (
            <div
              key={option.title}
              className="rounded-lg border border-zinc-200 bg-white p-5"
            >
              <h2 className="text-lg font-bold">
                {option.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {option.description}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/tienda"
          className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Ver tienda
        </Link>
      </section>
    </main>
  );
}
