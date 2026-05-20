import Link from "next/link";

const localNotes = [
  "Podes coordinar retiro en local despues de enviar el pedido.",
  "Tambien podes consultar disponibilidad para probar prendas.",
  "La direccion y horarios se pueden completar aca cuando los definas.",
];

export default function LocalPage() {
  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[1fr_1.1fr] md:px-10">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Showroom
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Local
          </h1>

          <p className="mt-5 text-zinc-600">
            Aca podemos mostrar direccion, horarios, retiro de pedidos y
            condiciones para probar prendas.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-bold">
            Informacion del local
          </h2>

          <div className="mt-6 space-y-4">
            {localNotes.map((note) => (
              <p
                key={note}
                className="border-b border-zinc-100 pb-4 text-sm leading-6 text-zinc-600 last:border-b-0 last:pb-0"
              >
                {note}
              </p>
            ))}
          </div>

          <Link
            href="/contacto"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Consultar visita
          </Link>
        </div>
      </section>
    </main>
  );
}
