const questions = [
  {
    title: "Cambios",
    body: "Podemos aclarar plazos, condiciones y si el cambio aplica por talle, color o modelo.",
  },
  {
    title: "Pruebas",
    body: "Conviene explicar si se puede probar en el local, si hay que coordinar antes y en que horarios.",
  },
  {
    title: "Envios",
    body: "Aca va la informacion de envios a todo el pais, tiempos aproximados y formas de entrega.",
  },
  {
    title: "Retiro en local",
    body: "Indica cuando se puede retirar, que datos llevar y si el pedido debe estar confirmado antes.",
  },
  {
    title: "Pagos",
    body: "La web arma el ticket y el pago se coordina por WhatsApp, fuera de la plataforma.",
  },
  {
    title: "Stock",
    body: "El carrito valida stock por talle y color. La reserva final se confirma cuando el pedido queda aprobado.",
  },
];

export default function QuestionsPage() {
  return (
    <main className="home-main-offset min-h-screen bg-zinc-100 text-black">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14 md:px-10">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Ayuda
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Preguntas
          </h1>

          <p className="mt-5 max-w-2xl text-zinc-600">
            Un lugar para responder dudas frecuentes antes de comprar:
            cambios, pruebas, envios, pagos, retiro y stock.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {questions.map((question) => (
            <article
              key={question.title}
              className="rounded-lg border border-zinc-200 bg-white p-5"
            >
              <h2 className="text-lg font-bold">
                {question.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {question.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
