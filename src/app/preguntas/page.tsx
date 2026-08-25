import Link from "next/link";
import { getHomeContent } from "@/lib/homeContent";

function getQuestions(showroomAddress: string) {
  return [
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
      body: `Podes retirar en ${showroomAddress}. Despues de confirmar que el pedido esta abonado y armado, puede retirarse en nuestro horario de atencion.`,
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
}

export default async function QuestionsPage() {
  const { socialLinks } = await getHomeContent();
  const questions = getQuestions(socialLinks.showroomAddress);

  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 md:px-8 md:pt-8">
        <header className="mb-6 border-b border-zinc-300 pb-5">
          <p className="font-brand text-base uppercase text-zinc-500">
            Ayuda
          </p>

          <h1 className="font-brand mt-1 text-4xl leading-none md:text-5xl">
            Preguntas
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Resolvemos las dudas mas comunes antes de comprar: minimo
            de compra, envios, retiro, pruebas, cambios, pagos y stock.
          </p>
        </header>

        <div className="grid border-t border-zinc-300 md:grid-cols-2">
          {questions.map((question, index) => (
            <article
              key={question.title}
              className="border-b border-zinc-300 py-5 md:px-6 md:odd:border-r md:odd:pl-0"
            >
              <div className="flex items-start gap-3">
                <span className="font-brand mt-0.5 w-7 shrink-0 text-base text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <h2 className="font-brand text-xl leading-tight md:text-2xl">
                    {question.title}
                  </h2>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600">
                    {question.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-4 border-y border-zinc-300 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-brand text-2xl leading-none">
              Tenes otra duda?
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-zinc-600">
              Podes escribirnos por WhatsApp o mirar el catalogo para armar tu
              pedido.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contacto"
              className="font-brand inline-flex h-10 items-center justify-center border border-zinc-300 px-5 text-base text-zinc-800 transition hover:bg-white"
            >
              Contacto
            </Link>

            <Link
              href="/tienda"
              className="font-brand inline-flex h-10 items-center justify-center bg-black px-5 text-base text-white transition hover:bg-zinc-800"
            >
              Ver catalogo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
