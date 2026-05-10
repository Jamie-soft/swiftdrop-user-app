import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./authStore";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (err) {
      console.error("[profile] fetch failed:", err);
      setError(err.message);
      setProfile(null);
    } else {
      setProfile((data as Profile) ?? null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  return { profile, loading, error, refresh };
}

export async function upsertProfile(fullName: string, phone: string): Promise<Profile> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) throw new Error("You must be signed in.");
  const payload = {
    id: u.user.id,
    full_name: fullName.trim(),
    phone: phone.trim(),
  };
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error) {
    console.error("[profile] upsert failed:", error);
    throw error;
  }
  console.log("[profile] saved:", data);
  return data as Profile;
}
