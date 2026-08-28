import { supabase } from "@/lib/supabase";
import type {
  CashMovement,
  CashMovementType,
  CashPaymentMethod,
  CashSession,
  SupabaseCashMovementRow,
  SupabaseCashSessionRow,
} from "@/types/cash";

function normalizeSession(row: SupabaseCashSessionRow): CashSession {
  return {
    id: row.id,
    openingAmount: Number(row.opening_amount),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    closingAmount:
      row.closing_amount == null ? null : Number(row.closing_amount),
    expectedAmount:
      row.expected_amount == null ? null : Number(row.expected_amount),
    difference: row.difference == null ? null : Number(row.difference),
    openingNote: row.opening_note,
    closingNote: row.closing_note,
  };
}

function normalizeMovement(row: SupabaseCashMovementRow): CashMovement {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.movement_type,
    paymentMethod: row.payment_method,
    description: row.description,
    amount: Number(row.amount),
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function getCashSessions(): Promise<CashSession[]> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeSession(row as SupabaseCashSessionRow)
  );
}

export async function getCashMovements(): Promise<CashMovement[]> {
  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeMovement(row as SupabaseCashMovementRow)
  );
}

export async function openCashSession(input: {
  openingAmount: number;
  note?: string;
}) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      opening_amount: input.openingAmount,
      opening_note: input.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSession(data as SupabaseCashSessionRow);
}

export async function closeCashSession(input: {
  sessionId: string;
  closingAmount: number;
  expectedAmount: number;
  note?: string;
}) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .update({
      closed_at: new Date().toISOString(),
      closing_amount: input.closingAmount,
      expected_amount: input.expectedAmount,
      difference: input.closingAmount - input.expectedAmount,
      closing_note: input.note?.trim() || null,
    })
    .eq("id", input.sessionId)
    .is("closed_at", null)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSession(data as SupabaseCashSessionRow);
}

export async function createCashMovement(input: {
  sessionId: string;
  type: CashMovementType;
  paymentMethod: CashPaymentMethod;
  description: string;
  amount: number;
  note?: string;
}) {
  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
      session_id: input.sessionId,
      movement_type: input.type,
      payment_method: input.paymentMethod,
      description: input.description.trim(),
      amount: input.amount,
      note: input.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeMovement(data as SupabaseCashMovementRow);
}

export async function deleteCashMovement(id: string) {
  const { error } = await supabase
    .from("cash_movements")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
