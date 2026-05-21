export default function AdminLocalSaleSection() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Preparado para mas adelante
          </p>

          <h2 className="text-3xl font-bold">
            Venta en local
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Esta solapa queda reservada para registrar ventas del showroom
            usando el mismo stock de la tienda. Por ahora no descuenta stock,
            no crea ventas y no modifica pedidos.
          </p>
        </div>

        <span className="w-fit rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Sin activar
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Buscar producto",
            description:
              "Seleccionar producto, color y talle para una venta presencial.",
          },
          {
            title: "Confirmar venta",
            description:
              "Registrar pago externo y descontar stock al confirmar.",
          },
          {
            title: "Historial del dia",
            description:
              "Ver ventas presenciales recientes y notas simples.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <h3 className="font-semibold">
              {item.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
