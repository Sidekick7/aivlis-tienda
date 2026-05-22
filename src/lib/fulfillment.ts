export type FulfillmentOption = "pickup" | "shipping";

export const fulfillmentStorageKey = "checkout_fulfillment";
export const logisticsFee = 5000;

export const fulfillmentOptions: Record<
  FulfillmentOption,
  {
    label: string;
    description: string;
    fee: number;
  }
> = {
  pickup: {
    label: "Retiro en persona",
    description: "Sin costo adicional.",
    fee: 0,
  },
  shipping: {
    label: "Correo o expreso",
    description:
      "Costo de entrega a logistica y embalaje. Envio a cargo del cliente segun peso y distancia.",
    fee: logisticsFee,
  },
};

export function isFulfillmentOption(
  value: string | null
): value is FulfillmentOption {
  return value === "pickup" || value === "shipping";
}

export function getFulfillmentFee(
  option: FulfillmentOption | ""
) {
  return option ? fulfillmentOptions[option].fee : 0;
}
