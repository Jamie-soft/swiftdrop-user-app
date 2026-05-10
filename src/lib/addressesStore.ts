import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./authStore";

export type Address = {
  id: string;
  user_id: string;
  label: string;
  address: string;
  created_at: string;
};

export function useAddresses() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (err) {
      console.error("[addresses] fetch failed:", err);
      setError(err.message);
      setAddresses([]);
    } else {
      console.log("[addresses] fetched", data?.length ?? 0, "rows");
      setAddresses((data ?? []) as Address[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { addresses, loading, error, refresh };
}

export async function addAddress(label: string, address: string): Promise<Address> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) throw new Error("You must be signed in.");
  const { data, error } = await supabase
    .from("addresses")
    .insert({ user_id: u.user.id, label, address })
    .select()
    .single();
  if (error) {
    console.error("[addresses] insert failed:", error);
    throw error;
  }
  console.log("[addresses] created:", data);
  return data as Address;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) {
    console.error("[addresses] delete failed:", error);
    throw error;
  }
  console.log("[addresses] deleted:", id);
}

/**
 * Save an address only if no existing address has the exact same value
 * for the current user. Used by the delivery "Save this address" checkbox.
 */
export async function saveAddressIfNew(label: string, address: string): Promise<void> {
  const value = address.trim();
  if (!value) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: existing } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", u.user.id)
    .eq("address", value)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log("[addresses] already saved, skipping:", value);
    return;
  }
  await addAddress(label, value);
}
