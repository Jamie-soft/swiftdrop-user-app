import { useEffect, useState } from "react";
import { supabase, type OrderRow } from "./supabase";
import { useAuth } from "./authStore";
import type { VehicleType } from "./deliveryStore";
import type { RideType } from "./rideStore";
import { assignRiderToOrder } from "./ridersStore";
import { computeOrderDistance } from "./distance";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "confirmed"
  | "completed"
  | "cancelled";

export type DeliveryOrder = {
  id: string;
  kind: "delivery";
  pickup: string;
  dropoff: string;
  vehicle: VehicleType;
  senderName: string;
  senderWhatsapp: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  distanceKm: number;
  price: number;
  riderId: string | null;
  status: OrderStatus;
  createdAt: number;
  packageType?: string | null;
  updatedAt?: number;
};

export type RideOrder = {
  id: string;
  kind: "ride";
  pickup: string;
  dropoff: string;
  rideType: RideType;
  distanceKm: number;
  price: number;
  riderId: string | null;
  status: OrderStatus;
  createdAt: number;
};

export type Order = DeliveryOrder | RideOrder;

// ----- Mapping helpers -----

function rowToOrder(row: OrderRow): Order {
  if (row.kind === "ride") {
    return {
      id: row.id,
      kind: "ride",
      pickup: row.pickup_address,
      dropoff: row.dropoff_address,
      rideType: (row.vehicle_type as RideType) ?? "standard",
      distanceKm: 0,
      price: Number(row.price) || 0,
      riderId: row.rider_id ?? null,
      status: (row.status as OrderStatus) ?? "pending",
      createdAt: new Date(row.created_at).getTime(),
    };
  }
  return {
    id: row.id,
    kind: "delivery",
    pickup: row.pickup_address,
    dropoff: row.dropoff_address,
    vehicle: (row.vehicle_type as VehicleType) ?? "bike",
    senderName: row.sender_name ?? "",
    senderWhatsapp: "",
    senderPhone: row.sender_phone ?? "",
    receiverName: row.receiver_name ?? "",
    receiverPhone: row.receiver_phone ?? "",
    distanceKm: Number(row.distance_km) || 0,
    price: Number(row.price) || 0,
    riderId: row.rider_id ?? null,
    status: (row.status as OrderStatus) ?? "pending",
    createdAt: new Date(row.created_at).getTime(),
    packageType: row.package_type ?? null,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  };
}

// ----- Public API: hooks -----

export function useOrders() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setOrders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (err) {
        console.error("[orders] fetch failed:", err);
        setError(err.message);
        setOrders([]);
      } else {
        setOrders((data ?? []).map(rowToOrder));
      }
      setLoading(false);
    }
    load();

    if (!userId) return () => { cancelled = true; };

    // Realtime: react to inserts/updates/deletes on this user's orders.
    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log("[orders] realtime event", payload.eventType, payload);
          setOrders((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as OrderRow)?.id;
              return prev.filter((o) => o.id !== oldId);
            }
            const row = payload.new as OrderRow;
            if (!row) return prev;
            const mapped = rowToOrder(row);
            const idx = prev.findIndex((o) => o.id === mapped.id);
            if (idx === -1) {
              // INSERT
              return [mapped, ...prev].sort((a, b) => b.createdAt - a.createdAt);
            }
            const next = prev.slice();
            next[idx] = mapped;
            return next;
          });
        },
      )
      .subscribe((status) => {
        console.log("[orders] realtime status:", status);
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { orders, loading, error };
}

// ----- Status display -----

export const STATUS_MAP: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  picked_up: "Picked Up",
  on_the_way: "On The Way",
  delivered: "Delivered",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatStatus(status: string): string {
  return STATUS_MAP[status] ?? status.replace(/_/g, " ");
}

// ----- Insert helpers -----

export type DeliveryStopInsert = {
  address: string;
  lat?: number | null;
  lng?: number | null;
  receiverName: string;
  receiverPhone: string;
};

export type DeliveryInsert = {
  pickup: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoff: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  vehicle: VehicleType;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  price: number;
  distanceKm?: number | null;
  packageType?: string | null;
  packageSize?: string | null;
  finalPrice?: number | null;
  discountAmount?: number | null;
  surgeMultiplier?: number | null;
  promoCode?: string | null;
  isMultiStop?: boolean;
  stops?: DeliveryStopInsert[];
};

export type RideInsert = {
  pickup: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoff: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  rideType: RideType;
  price: number;
  distanceKm?: number | null;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    console.error("[orders] no authenticated user:", error);
    throw new Error("You must be signed in to place an order.");
  }
  return data.user.id;
}

/**
 * Insert order payload. If the database doesn't yet have optional columns
 * (geo or pricing), retry once stripping the missing ones so existing
 * deployments keep working until the migration is applied.
 */
async function insertOrderRow(payload: Record<string, unknown>) {
  const optionalCols = [
    "pickup_lat",
    "pickup_lng",
    "dropoff_lat",
    "dropoff_lng",
    "distance_km",
    "estimated_duration",
    "package_type",
    "package_size",
    "final_price",
    "discount_amount",
    "surge_multiplier",
    "promo_code",
    "is_multi_stop",
    "total_stops",
  ];
  let attempt = { ...payload };
  for (let i = 0; i < 3; i++) {
    const res = await supabase.from("orders").insert(attempt).select().single();
    if (!res.error) return res;
    const msg = String(res.error.message || "").toLowerCase();
    const missing = optionalCols.find((c) => msg.includes(c) && c in attempt);
    if (!missing) return res;
    console.warn(`[orders] column "${missing}" missing — retrying without it.`);
    const next = { ...attempt };
    delete next[missing];
    attempt = next;
  }
  return supabase.from("orders").insert(attempt).select().single();
}

export async function insertDeliveryOrder(o: DeliveryInsert) {
  const userId = await getCurrentUserId();
  const isMultiStop = !!o.isMultiStop && (o.stops?.length ?? 0) >= 2;

  // Single source of truth: compute distance + ETA once at order creation.
  const computed = computeOrderDistance({
    pickup: { lat: o.pickupLat ?? null, lng: o.pickupLng ?? null },
    dropoff: { lat: o.dropoffLat ?? null, lng: o.dropoffLng ?? null },
    stops: isMultiStop
      ? (o.stops ?? []).map((s) => ({ lat: s.lat ?? null, lng: s.lng ?? null }))
      : undefined,
  });
  const distanceKm = computed.distanceKm ?? o.distanceKm ?? null;
  const estimatedDuration = computed.estimatedDuration;

  const payload = {
    user_id: userId,
    pickup_address: o.pickup,
    pickup_lat: o.pickupLat ?? null,
    pickup_lng: o.pickupLng ?? null,
    dropoff_address: o.dropoff,
    dropoff_lat: o.dropoffLat ?? null,
    dropoff_lng: o.dropoffLng ?? null,
    vehicle_type: o.vehicle,
    price: o.price,
    final_price: o.finalPrice ?? o.price,
    discount_amount: o.discountAmount ?? 0,
    surge_multiplier: o.surgeMultiplier ?? 1,
    promo_code: o.promoCode ?? null,
    distance_km: distanceKm,
    estimated_duration: estimatedDuration,
    package_type: o.packageType ?? null,
    package_size: o.packageSize ?? null,
    sender_name: o.senderName,
    sender_phone: o.senderPhone,
    receiver_name: o.receiverName,
    receiver_phone: o.receiverPhone,
    is_multi_stop: isMultiStop,
    total_stops: isMultiStop ? o.stops!.length : null,
    kind: "delivery",
    status: "pending",
  };
  const { data, error } = await insertOrderRow(payload);

  if (error) {
    console.error("[orders] insert delivery failed:", error);
    throw error;
  }
  console.log("[orders] delivery created:", data);

  // Insert order_stops (best-effort — if the table doesn't exist yet,
  // the order itself still succeeds).
  if (isMultiStop && o.stops && o.stops.length) {
    const rows = o.stops.map((s, i) => ({
      order_id: data.id,
      stop_order: i + 1,
      address: s.address,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      receiver_name: s.receiverName,
      receiver_phone: s.receiverPhone,
      status: "pending",
    }));
    const { error: stopsErr } = await supabase.from("order_stops").insert(rows);
    if (stopsErr) {
      console.warn("[orders] failed to insert order_stops:", stopsErr.message);
    }
  }

  await assignRiderToOrder(data.id, "delivery", o.vehicle);
  return data as OrderRow;
}
export async function insertRideOrder(o: RideInsert) {
  const userId = await getCurrentUserId();
  const computed = computeOrderDistance({
    pickup: { lat: o.pickupLat ?? null, lng: o.pickupLng ?? null },
    dropoff: { lat: o.dropoffLat ?? null, lng: o.dropoffLng ?? null },
  });
  const payload = {
    user_id: userId,
    pickup_address: o.pickup,
    pickup_lat: o.pickupLat ?? null,
    pickup_lng: o.pickupLng ?? null,
    dropoff_address: o.dropoff,
    dropoff_lat: o.dropoffLat ?? null,
    dropoff_lng: o.dropoffLng ?? null,
    vehicle_type: o.rideType,
    price: o.price,
    distance_km: computed.distanceKm ?? o.distanceKm ?? null,
    estimated_duration: computed.estimatedDuration,
    sender_name: null,
    sender_phone: null,
    receiver_name: null,
    receiver_phone: null,
    kind: "ride",
    status: "pending",
  };
  const { data, error } = await insertOrderRow(payload);

  if (error) {
    console.error("[orders] insert ride failed:", error);
    throw error;
  }
  console.log("[orders] ride created:", data);
  await assignRiderToOrder(data.id, "ride", o.rideType);
  return data as OrderRow;
}

// ----- Pricing -----

export function fakeDistanceKm(): number {
  return Math.round((3 + Math.random() * 7) * 10) / 10;
}

export const DELIVERY_RATES: Record<VehicleType, { base: number; perKm: number; label: string }> = {
  bike: { base: 1000, perKm: 300, label: "Bike" },
  van: { base: 3000, perKm: 500, label: "Van" },
  bulk: { base: 5000, perKm: 800, label: "Bulk" },
};

export const RIDE_RATES: Record<RideType, { base: number; perKm: number; label: string }> = {
  standard: { base: 800, perKm: 250, label: "Standard" },
  luxury: { base: 2500, perKm: 600, label: "Luxury" },
  xl: { base: 1500, perKm: 400, label: "XL" },
};

export function calcDeliveryPrice(vehicle: VehicleType, km: number): number {
  const r = DELIVERY_RATES[vehicle];
  return Math.round(r.base + r.perKm * km);
}

export function calcRidePrice(rideType: RideType, km: number): number {
  const r = RIDE_RATES[rideType];
  return Math.round(r.base + r.perKm * km);
}

export function formatNaira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}
