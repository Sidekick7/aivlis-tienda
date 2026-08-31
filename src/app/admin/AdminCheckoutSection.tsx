"use client";

import { PackageCheck, Percent, Save, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { CheckoutSettings } from "@/types/checkoutSettings";

type Props = {
  settings: CheckoutSettings;
  error: string;
  isSaving: boolean;
  onSave: (settings: CheckoutSettings) => Promise<void>;
};

function parseNumber(value: string) {
  return Number(value.trim().replace(",", "."));
}

function isValidNumber(value: string, maximum?: number) {
  const parsed = parseNumber(value);

  return (
    Boolean(value.trim()) &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    (maximum === undefined || parsed <= maximum)
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="relative h-6 w-11 rounded-full bg-zinc-700 transition peer-checked:bg-emerald-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
      {checked ? "Activo" : "Inactivo"}
    </label>
  );
}

function MoneyInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid h-10 w-[150px] grid-cols-[34px_1fr] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 focus-within:border-zinc-500">
      <span className="flex items-center justify-center border-r border-zinc-700 text-sm font-semibold text-zinc-400">
        $
      </span>
      <input
        type="number"
        min="0"
        step="100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onWheel={(event) => event.currentTarget.blur()}
        disabled={disabled}
        className="min-w-0 bg-transparent px-3 text-right text-sm font-semibold text-white outline-none disabled:opacity-40"
      />
    </label>
  );
}

export default function AdminCheckoutSection({
  settings,
  error,
  isSaving,
  onSave,
}: Props) {
  const [minimumEnabled, setMinimumEnabled] = useState(
    settings.minimumPurchaseEnabled
  );
  const [minimumAmount, setMinimumAmount] = useState(
    String(settings.minimumPurchaseAmount)
  );
  const [shippingEnabled, setShippingEnabled] = useState(
    settings.shippingFeeEnabled
  );
  const [shippingAmount, setShippingAmount] = useState(
    String(settings.shippingFeeAmount)
  );
  const [transferEnabled, setTransferEnabled] = useState(
    settings.transferSurchargeEnabled
  );
  const [transferPercent, setTransferPercent] = useState(
    String(settings.transferSurchargePercent)
  );
  const isMinimumValid = isValidNumber(minimumAmount);
  const isShippingValid = isValidNumber(shippingAmount);
  const isTransferValid = isValidNumber(transferPercent, 100);
  const isFormValid =
    isMinimumValid && isShippingValid && isTransferValid;

  const handleSave = () =>
    onSave({
      minimumPurchaseEnabled: minimumEnabled,
      minimumPurchaseAmount: parseNumber(minimumAmount),
      shippingFeeEnabled: shippingEnabled,
      shippingFeeAmount: parseNumber(shippingAmount),
      transferSurchargeEnabled: transferEnabled,
      transferSurchargePercent: parseNumber(transferPercent),
    });

  return (
    <div className="mx-auto mt-4 max-w-2xl">
      <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-700 px-4 py-3">
          <div>
            <h2 className="text-lg font-black text-white">Checkout web</h2>
            <p className="text-xs text-zinc-400">
              Importes y condiciones visibles al comprador.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || Boolean(error) || !isFormValid}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={15} strokeWidth={2.5} />
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </header>

        {error && (
          <div className="border-b border-yellow-400/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-100">
            {error}
          </div>
        )}

        <div className="divide-y divide-zinc-700">
          <section className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <ShoppingBag className="mt-0.5 shrink-0 text-zinc-400" size={18} />
              <div>
                <h3 className="text-sm font-bold text-white">Compra mínima</h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Mínimo necesario para finalizar un pedido web.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <Toggle
                checked={minimumEnabled}
                disabled={isSaving}
                onChange={setMinimumEnabled}
              />
              <MoneyInput
                value={minimumAmount}
                disabled={isSaving || !minimumEnabled}
                onChange={setMinimumAmount}
              />
            </div>
          </section>

          <section className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <PackageCheck className="mt-0.5 shrink-0 text-zinc-400" size={18} />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Embalaje y cadetería
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Se suma únicamente cuando el comprador elige envío.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <Toggle
                checked={shippingEnabled}
                disabled={isSaving}
                onChange={setShippingEnabled}
              />
              <MoneyInput
                value={shippingAmount}
                disabled={isSaving || !shippingEnabled}
                onChange={setShippingAmount}
              />
            </div>
          </section>

          <section className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <Percent className="mt-0.5 shrink-0 text-zinc-400" size={18} />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Recargo por transferencia
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Porcentaje aplicado a pedidos web por transferencia.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <Toggle
                checked={transferEnabled}
                disabled={isSaving}
                onChange={setTransferEnabled}
              />
              <label className="grid h-10 w-[150px] grid-cols-[1fr_34px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 focus-within:border-zinc-500">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={transferPercent}
                  onChange={(event) => setTransferPercent(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  onWheel={(event) => event.currentTarget.blur()}
                  disabled={isSaving || !transferEnabled}
                  className="min-w-0 bg-transparent px-3 text-right text-sm font-semibold text-white outline-none disabled:opacity-40"
                />
                <span className="flex items-center justify-center border-l border-zinc-700 text-sm font-semibold text-zinc-400">
                  %
                </span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
