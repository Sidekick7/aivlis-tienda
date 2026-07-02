import Link from "next/link";

const questions = [
  {
    title: "Como compro?",
    body: "Elegis producto, talle y color, lo agregas al carrito, seleccionas retiro o envio, completas tus datos y envias el pedido por WhatsApp.",
  },
  {
    title: "Hay minimo de compra?",
    body: "Si. El minimo de compra es de $100.000.",
  },
  {
    title: "Que pasa si no llego al minimo?",
    body: "Podes armar el carrito, pero para finalizar el pedido tenes que llegar al minimo de compra. El carrito te muestra cuanto falta.",
  },
  {
    title: "Envios",
    body: "Hacemos envios por correo o expreso. Se suma un costo de entrega a logistica y embalaje de $5.000. El envio queda a cargo del cliente segun peso y distancia.",
  },
  {
    title: "Retiro en showroom",
    body: "Podes retirar en Yerbal 3160, Flores, CABA. Despues de confirmar que el pedido esta abonado y armado, puede retirarse en nuestro horario de atencion.",
  },
  {
    title: "Puedo probarme las prendas?",
    body: "Solo camperas. Si buscas un talle o color puntual, conviene consultar disponibilidad antes de venir.",
  },
  {
    title: "Cambios",
    body: "Los cambios por talle se realizan dentro de los 7 dias y quedan sujetos a stock disponible.",
  },
  {
    title: "Cuales son las formas de pago?",
    body: "En showroom: efectivo, Mercado Pago o transferencia bancaria.\nEn la web: efectivo, transferencia bancaria y Mercado Pago. Se coordina por WhatsApp.",
  },
  {
    title: "Stock",
    body: "El stock se maneja por talle y color. El carrito valida disponibilidad al crear el pedido y avisa si alguna variante no alcanza.",
  },
  {
    title: "Cuando se reserva stock?",
    body: "Cuando se crea el pedido. Una vez que nos comunicamos, hay 24 hs para abonarlo. De lo contrario, se cancela y se pierde la reserva de las prendas.",
  },
];

export default function QuestionsPage() {
  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-10 pt-5 md:px-10 lg:pb-12 lg:pt-7">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Ayuda
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Preguntas
          </h1>

          <p className="mt-5 max-w-2xl text-zinc-600">
            Resolvemos las dudas mas comunes antes de comprar: minimo
            de compra, envios, retiro, pruebas, cambios, pagos y stock.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {questions.map((question, index) => (
            <article
              key={question.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-500">
                  {index + 1}
                </span>

                <div>
                  <h2 className="text-lg font-bold">
                    {question.title}
                  </h2>

                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-600">
                    {question.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Tenes otra duda?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Podes escribirnos por WhatsApp o mirar el catalogo para armar tu
              pedido.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contacto"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-100 px-5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              Contacto
            </Link>

            <Link
              href="/tienda"
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Ver catalogo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
