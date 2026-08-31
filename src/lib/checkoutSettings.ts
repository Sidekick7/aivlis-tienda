import { supabase } from "@/lib/supabase";
import type {
  CheckoutSettings,
  SupabaseCheckoutSettingsRow,
} from "@/types/checkoutSettings";

export const fallbackCheckoutSettings: CheckoutSettings = {
  minimumPurchaseEnabled: true,
  minimumPurchaseAmount: 100000,
  shippingFeeEnabled: true,
  shippingFeeAmount: 5000,
  transferSurchargeEnabled: true,
  transferSurchargePercent: 5,
};

export function getMinimumPurchaseAmount(settings: CheckoutSettings) {
  if (!settings.minimumPurchaseEnabled) return 0;

  return Math.max(0, Math.round(settings.minimumPurchaseAmount));
}

export function getShippingFeeAmount(settings: CheckoutSettings) {
  if (!settings.shippingFeeEnabled) return 0;

  return Math.max(0, Math.round(settings.shippingFeeAmount));
}

export function getTransferSurcharge(
  baseTotal: number,
  settings: CheckoutSettings
) {
  if (!settings.transferSurchargeEnabled) return 0;

  return Math.round(
    baseTotal * (settings.transferSurchargePercent / 100)
  );
}

export function formatTransferSurchargeLabel(
  settings: CheckoutSettings
) {
  const percent = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(settings.transferSurchargePercent);

  return `Transferencia ${percent}%`;
}

function normalizeCheckoutSettings(
  row: SupabaseCheckoutSettingsRow
): CheckoutSettings {
  const percent = Number(row.transfer_surcharge_percent);
  const minimumPurchaseAmount = Number(row.minimum_purchase_amount);
  const shippingFeeAmount = Number(row.shipping_fee_amount);

  return {
    minimumPurchaseEnabled:
      row.minimum_purchase_enabled ??
      fallbackCheckoutSettings.minimumPurchaseEnabled,
    minimumPurchaseAmount: Number.isFinite(minimumPurchaseAmount)
      ? Math.max(0, minimumPurchaseAmount)
      : fallbackCheckoutSettings.minimumPurchaseAmount,
    shippingFeeEnabled:
      row.shipping_fee_enabled ??
      fallbackCheckoutSettings.shippingFeeEnabled,
    shippingFeeAmount: Number.isFinite(shippingFeeAmount)
      ? Math.max(0, shippingFeeAmount)
      : fallbackCheckoutSettings.shippingFeeAmount,
    transferSurchargeEnabled:
      row.transfer_surcharge_enabled ??
      fallbackCheckoutSettings.transferSurchargeEnabled,
    transferSurchargePercent: Number.isFinite(percent)
      ? Math.min(100, Math.max(0, percent))
      : fallbackCheckoutSettings.transferSurchargePercent,
  };
}

export async function getCheckoutSettings({
  fallbackToStatic = true,
}: {
  fallbackToStatic?: boolean;
} = {}): Promise<CheckoutSettings> {
  const { data, error } = await supabase
    .from("checkout_settings")
    .select(
      "id,minimum_purchase_enabled,minimum_purchase_amount,shipping_fee_enabled,shipping_fee_amount,transfer_surcharge_enabled,transfer_surcharge_percent"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    if (fallbackToStatic) return fallbackCheckoutSettings;
    throw error ?? new Error("No se encontro la configuracion del checkout.");
  }

  return normalizeCheckoutSettings(
    data as SupabaseCheckoutSettingsRow
  );
}

export async function updateCheckoutSettings(
  settings: CheckoutSettings
) {
  const { error } = await supabase.from("checkout_settings").upsert({
    id: 1,
    minimum_purchase_enabled: settings.minimumPurchaseEnabled,
    minimum_purchase_amount: settings.minimumPurchaseAmount,
    shipping_fee_enabled: settings.shippingFeeEnabled,
    shipping_fee_amount: settings.shippingFeeAmount,
    transfer_surcharge_enabled: settings.transferSurchargeEnabled,
    transfer_surcharge_percent: settings.transferSurchargePercent,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
