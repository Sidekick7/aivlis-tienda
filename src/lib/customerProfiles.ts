import { supabase } from "@/lib/supabase";

export type CustomerProfileFields = {
  name: string;
  dni: string;
  whatsapp: string;
  address: string;
  city: string;
  province: string;
  zip: string;
  email: string;
};

type CustomerProfileRow = CustomerProfileFields & {
  user_id: string;
};

const customerProfileColumns =
  "user_id, email, name, dni, whatsapp, address, city, province, zip";

export const emptyCustomerProfile: CustomerProfileFields = {
  name: "",
  dni: "",
  whatsapp: "",
  address: "",
  city: "",
  province: "",
  zip: "",
  email: "",
};

function mapCustomerProfile(row: CustomerProfileRow): CustomerProfileFields {
  return {
    name: row.name || "",
    dni: row.dni || "",
    whatsapp: row.whatsapp || "",
    address: row.address || "",
    city: row.city || "",
    province: row.province || "",
    zip: row.zip || "",
    email: row.email || "",
  };
}

export async function getCustomerProfile(userId: string) {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select(customerProfileColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data
    ? mapCustomerProfile(data as CustomerProfileRow)
    : null;
}

export async function saveCustomerProfile(
  userId: string,
  profile: CustomerProfileFields
) {
  const { data, error } = await supabase
    .from("customer_profiles")
    .upsert(
      {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select(customerProfileColumns)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCustomerProfile(data as CustomerProfileRow);
}
