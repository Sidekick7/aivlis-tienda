import {
  CreditCard,
  Minus,
  NotebookPen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const paymentMethods = [
  "Efectivo",
  "Transferencia",
  "Mixto",
];

const saleSteps = [
  "Buscar por SKU o nombre",
  "Elegir color y talle",
  "Confirmar pago",
  "Descontar stock",
];

const previewProducts = [
  {
    sku: "000123",
    name: "Remera basica",
    detail: "Negro / Blanco · Talles S al XL",
  },
  {
    sku: "000124",
    name: "Short bermuda",
    detail: "Azul / Negro · Talles M al XXL",
  },
];

const colorOptions = ["Negro", "Blanco", "Rojo"];
const sizeOptions = ["S", "M", "L", "XL"];

export default function AdminLocalSaleSection() {
  return (
    <section className="grid gap-5">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Venta presencial
            </p>

            <h2 className="text-3xl font-bold">
              Venta en local
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Interfaz preparada para vender en mostrador: buscar por SKU,
              cargar productos, registrar el medio de pago y guardar un
              historial simple. Todavia no descuenta stock ni crea ventas.
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
            Visual
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {saleSteps.map((step, index) => (
            <span
              key={step}
              className="inline-flex items-center gap-2"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] text-zinc-400">
                {index + 1}
              </span>

              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Search
                  size={20}
                  className="text-emerald-300"
                />

                <h3 className="font-semibold">
                  Buscar producto
                </h3>
              </div>

              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-500">
                SKU recomendado
              </span>
            </div>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                type="search"
                disabled
                placeholder="Buscar por SKU, nombre o categoria"
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-11 text-sm text-zinc-400 outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_280px]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="mb-3 text-sm font-semibold text-zinc-300">
                  Resultados rapidos
                </p>

                <div className="grid gap-2">
                  {previewProducts.map((product, index) => (
                    <button
                      key={product.sku}
                      type="button"
                      disabled
                      className={`rounded-xl border px-3 py-3 text-left disabled:cursor-not-allowed ${
                        index === 0
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-white">
                        AIV-{product.sku} · {product.name}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {product.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-sm font-semibold text-zinc-300">
                  Seleccion
                </p>

                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Color
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color, index) => (
                        <button
                          key={color}
                          type="button"
                          disabled
                          className={`h-8 rounded-full px-3 text-xs font-semibold disabled:cursor-not-allowed ${
                            index === 0
                              ? "bg-white text-black"
                              : "bg-zinc-950 text-zinc-500"
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Talle
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sizeOptions.map((size, index) => (
                        <button
                          key={size}
                          type="button"
                          disabled
                          className={`h-8 min-w-8 rounded-lg px-3 text-xs font-semibold disabled:cursor-not-allowed ${
                            index === 1
                              ? "bg-white text-black"
                              : "bg-zinc-950 text-zinc-500"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_110px] gap-2">
                    <div className="flex h-11 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-500">
                      <Minus size={14} />
                      <span className="font-semibold text-zinc-300">1</span>
                      <Plus size={14} />
                    </div>

                    <button
                      type="button"
                      disabled
                      className="h-11 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-500 disabled:cursor-not-allowed"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-4 flex items-center gap-3">
                <CreditCard
                  size={20}
                  className="text-emerald-300"
                />

                <h3 className="font-semibold">
                  Medio de pago
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    disabled
                    className="h-9 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-xs font-semibold text-zinc-400 disabled:cursor-not-allowed"
                  >
                    {method}
                  </button>
                ))}
              </div>

              <p className="mt-3 rounded-xl bg-zinc-900 px-4 py-3 text-xs text-zinc-500">
                El calculo de recibido, vuelto o restante aparece al confirmar venta.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-4 flex items-center gap-3">
                <NotebookPen
                  size={20}
                  className="text-emerald-300"
                />

                <h3 className="font-semibold">
                  Nota interna
                </h3>
              </div>

              <textarea
                disabled
                placeholder="Ej: cliente retira despues, pago parcial, cambio de talle..."
                className="min-h-24 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-500 outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          </div>

        </div>

        <aside className="grid gap-5">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                Venta actual
              </h3>

              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-500">
                Borrador
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Remera basica
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      SKU 000123 · Negro / M · x1
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="mt-3 text-right text-sm font-semibold text-white">
                  $0
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-zinc-400">
              <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                <span>Productos</span>
                <span>1</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                <span>Metodo</span>
                <span>Sin elegir</span>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Total a cobrar
              </p>

              <p className="mt-2 text-5xl font-black tracking-normal text-white">
                $0
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-5 h-12 w-full rounded-xl bg-emerald-500/20 font-semibold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar venta
            </button>
          </div>

        </aside>
      </div>
    </section>
  );
}
