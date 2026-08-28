export type CashMovementType = "income" | "expense";
export type CashPaymentMethod = "cash" | "transfer";

export type CashSession = {
  id: string;
  openingAmount: number;
  openedAt: string;
  closedAt?: string | null;
  closingAmount?: number | null;
  expectedAmount?: number | null;
  difference?: number | null;
  openingNote?: string | null;
  closingNote?: string | null;
};

export type CashMovement = {
  id: string;
  sessionId: string;
  type: CashMovementType;
  paymentMethod: CashPaymentMethod;
  description: string;
  amount: number;
  note?: string | null;
  createdAt: string;
};

export type SupabaseCashSessionRow = {
  id: string;
  opening_amount: number | string;
  opened_at: string;
  closed_at?: string | null;
  closing_amount?: number | string | null;
  expected_amount?: number | string | null;
  difference?: number | string | null;
  opening_note?: string | null;
  closing_note?: string | null;
};

export type SupabaseCashMovementRow = {
  id: string;
  session_id: string;
  movement_type: CashMovementType;
  payment_method: CashPaymentMethod;
  description: string;
  amount: number | string;
  note?: string | null;
  created_at: string;
};
