import { supabase, type OrderStopRow } from "./supabase";

/**
 * Fetch the next pending stop for a multi-stop order, ordered by stop_order ASC.
 * Returns null if every stop is delivered (or none exist).
 */
export async function getNextPendingStop(
  orderId: string,
): Promise<OrderStopRow | null> {
  const { data, error } = await supabase
    .from("order_stops")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .order("stop_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[order_stops] getNextPendingStop failed:", error.message);
    return null;
  }
  return (data as OrderStopRow | null) ?? null;
}

/**
 * Mark a single stop as delivered. If all stops on the parent order are then
 * delivered, also flips the parent order status to 'delivered'.
 *
 * Returns the refreshed list of stops for the parent order.
 */
export async function markStopDelivered(
  stopId: string,
  opts?: { undo?: boolean },
): Promise<OrderStopRow[]> {
  const nextStatus = opts?.undo ? "pending" : "delivered";

  // 1. Update the stop.
  const { data: updated, error: updErr } = await supabase
    .from("order_stops")
    .update({ status: nextStatus })
    .eq("id", stopId)
    .select()
    .maybeSingle();

  if (updErr || !updated) {
    console.error("[order_stops] markStopDelivered failed:", updErr?.message);
    throw updErr ?? new Error("Stop not found");
  }

  const orderId = (updated as OrderStopRow).order_id;

  // 2. Refetch all stops for this order.
  const { data: latest, error: listErr } = await supabase
    .from("order_stops")
    .select("*")
    .eq("order_id", orderId)
    .order("stop_order", { ascending: true });

  if (listErr) {
    console.warn("[order_stops] refetch failed:", listErr.message);
    return [updated as OrderStopRow];
  }

  const stops = (latest ?? []) as OrderStopRow[];

  // 3. If every stop is delivered, mark the parent order delivered.
  if (
    !opts?.undo &&
    stops.length > 0 &&
    stops.every((s) => s.status === "delivered")
  ) {
    const { error: orderErr } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    if (orderErr) {
      console.warn(
        "[order_stops] failed to mark order delivered:",
        orderErr.message,
      );
    }
  }

  return stops;
}
