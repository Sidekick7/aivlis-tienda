import type { CartItem } from "@/context/CartContext";

export type CustomerInfo = {
  name: string;
  dni: string;
  whatsapp: string;
  address: string;
  city: string;
  province: string;
  zip: string;
  email?: string;
  notes?: string;
};

export type CreateOrderTicketInput = {
  orderNumber: string;
  cart: CartItem[];
  customer: CustomerInfo;
  total: number;
  whatsappMessage: string;
};

export type CreatedOrderTicket = {
  id: string;
  orderNumber: string;
};
