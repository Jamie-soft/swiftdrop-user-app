import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Rider = {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  is_available: boolean;
  current_location: string | null;
};

// Map ride types → vehicle_type values used in riders table.
// Rides reuse the riders pool with vehicle_type="car" for standard/luxury/xl.
function vehicleForKind(kind: "delivery" | "ride", vehicleOrRide: string): string[] {
  if (kind === "ride") return ["car"];
  // delivery vehicle types map directly
  return [vehicleOrRide];
}

/**
 * Pick an available rider matching the requested vehicle type and atomically
 * mark them unavailable + attach to the given order. Returns the rider, or
 * null if none was available.
 */
export async function assignRiderToOrder(
  orderId: string,
  kind: "delivery" | "ride",
  vehicleOrRide: string,
): Promise<Rider | null> {
  const candidates = vehicleForKind(kind, vehicleOrRide);

  // 1. Find an available rider matching the vehicle type. Fallback to any
  //    available rider if no exact match.
  let { data: rider, error } = await supabase
    .from("riders")
    .select("*")
    .eq("is_available", true)
    .in("vehicle_type", candidates)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[riders] lookup failed:", error);
    return null;
  }

  if (!rider) {
    const fallback = await supabase
      .from("riders")
      .select("*")
      .eq("is_available", true)
      .limit(1)
      .maybeSingle();
    if (fallback.error) {
      console.error("[riders] fallback lookup failed:", fallback.error);
      return null;
    }
    rider = fallback.data;
  }

  if (!rider) {
    console.warn("[riders] no available rider");
    return null;
  }

  // 2. Mark rider unavailable (best-effort lock via is_available filter).
  const { data: locked, error: lockErr } = await supabase
    .from("riders")
    .update({ is_available: false })
    .eq("id", rider.id)
    .eq("is_available", true)
    .select()
    .maybeSingle();

  if (lockErr || !locked) {
    console.warn("[riders] lock race, retrying assignment", lockErr);
    // Recurse once to try a different rider.
    return assignRiderToOrder(orderId, kind, vehicleOrRide);
  }

  // 3. Attach rider to the order.
  const { error: orderErr } = await supabase
    .from("orders")
    .update({ rider_id: rider.id })
    .eq("id", orderId);

  if (orderErr) {
    console.error("[riders] failed to attach rider to order:", orderErr);
    // Roll back availability so we don't strand a rider.
    await supabase.from("riders").update({ is_available: true }).eq("id", rider.id);
    return null;
  }

  console.log("[riders] assigned", rider.name, "to order", orderId);

  // 4. Demo: free the rider again after 90s so the pool doesn't drain.
  setTimeout(() => {
    void supabase
      .from("riders")
      .update({ is_available: true })
      .eq("id", rider!.id)
      .then(({ error: relErr }) => {
        if (relErr) console.warn("[riders] release failed:", relErr);
        else console.log("[riders] released", rider!.name);
      });
  }, 90_000);

  return rider as Rider;
}

/**
 * Fetch a rider by id (used to display assigned rider details).
 */
export function useRider(riderId: string | null | undefined) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState<boolean>(!!riderId);

  useEffect(() => {
    let cancelled = false;
    if (!riderId) {
      setRider(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const fetchRider = () =>
      supabase
        .from("riders")
        .select("*")
        .eq("id", riderId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) console.error("[riders] fetch failed:", error);
          setRider((data as Rider) ?? null);
          setLoading(false);
        });

    void fetchRider();

    const channel = supabase
      .channel(`rider-${riderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "riders", filter: `id=eq.${riderId}` },
        (payload) => {
          if (cancelled) return;
          setRider((payload.new as Rider) ?? null);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [riderId]);

  return { rider, loading };
}

/**
 * Bulk-fetch riders for a list of ids (used on the activity list).
 */
export function useRidersByIds(ids: (string | null | undefined)[]) {
  const key = ids.filter(Boolean).sort().join(",");
  const [map, setMap] = useState<Record<string, Rider>>({});

  useEffect(() => {
    let cancelled = false;
    const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
    if (unique.length === 0) {
      setMap({});
      return;
    }
    supabase
      .from("riders")
      .select("*")
      .in("id", unique)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[riders] bulk fetch failed:", error);
          return;
        }
        const next: Record<string, Rider> = {};
        (data ?? []).forEach((r) => {
          next[(r as Rider).id] = r as Rider;
        });
        setMap(next);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}
