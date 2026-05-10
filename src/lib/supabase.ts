import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iurelapdybhvwlssbboi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_R--XknL8FfKajZeoecHF2A_g_gpD7bc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type OrderRow = {
  id: string;
  user_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  vehicle_type: string;
  price: number;
  final_price: number | null;
  discount_amount: number | null;
  surge_multiplier: number | null;
  promo_code: string | null;
  distance_km: number | null;
  estimated_duration: string | null;
  package_type: string | null;
  package_size: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  is_multi_stop?: boolean | null;
  total_stops?: number | null;
  kind: "delivery" | "ride";
  status: string;
  created_at: string;
  updated_at?: string | null;
  rider_id: string | null;
};

export type OrderStopRow = {
  id: string;
  order_id: string;
  stop_order: number;
  address: string;
  lat: number | null;
  lng: number | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  status: string;
  created_at: string;
};
