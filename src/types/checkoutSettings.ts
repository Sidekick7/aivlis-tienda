export type CheckoutSettings = {
  minimumPurchaseEnabled: boolean;
  minimumPurchaseAmount: number;
  shippingFeeEnabled: boolean;
  shippingFeeAmount: number;
  transferSurchargeEnabled: boolean;
  transferSurchargePercent: number;
};

export type SupabaseCheckoutSettingsRow = {
  id: number;
  minimum_purchase_enabled?: boolean | null;
  minimum_purchase_amount?: number | string | null;
  shipping_fee_enabled?: boolean | null;
  shipping_fee_amount?: number | string | null;
  transfer_surcharge_enabled?: boolean | null;
  transfer_surcharge_percent?: number | string | null;
};
