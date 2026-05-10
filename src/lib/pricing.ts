import type { VehicleType } from "./deliveryStore";

export type PackageSize = "small" | "medium" | "large";

export const PACKAGE_SIZES: Record<PackageSize, { label: string; helper: string; multiplier: number }> = {
  small: { label: "Small", helper: "0–2kg", multiplier: 1.0 },
  medium: { label: "Medium", helper: "2–5kg", multiplier: 1.2 },
  large: { label: "Large", helper: "5–10kg", multiplier: 1.5 },
};

export const PACKAGE_TYPES = [
  "Documents",
  "Food",
  "Electronics",
  "Clothing",
  "Fragile Item",
  "Other",
] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const VEHICLE_PRICING: Record<VehicleType, { base: number; perKm: number; minFare: number }> = {
  bike: { base: 1500, perKm: 300, minFare: 2000 },
  van: { base: 3000, perKm: 500, minFare: 4000 },
  bulk: { base: 5000, perKm: 800, minFare: 6000 },
};

/** Absolute price floor regardless of discounts. */
export const ABSOLUTE_PRICE_FLOOR = 1000;

/** Haversine distance between two lat/lng points in kilometers. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sum the chained distance through a list of waypoints, in km. */
export function chainedDistanceKm(
  points: Array<{ lat: number; lng: number }>,
): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineKm(points[i], points[i + 1]);
  }
  return total;
}

/** Per-stop fee added on top of distance pricing for multi-stop bulk runs. */
export const PER_STOP_FEE = 300;

/** Round price to nearest 50 (cleaner UX). */
export function roundPrice(n: number): number {
  return Math.round(n / 50) * 50;
}

// ----- Surge -----

/** Returns the time-based surge multiplier. Peak hours = 17:00–20:59 → 1.2x. */
export function getTimeSurge(date: Date = new Date()): number {
  const h = date.getHours();
  if (h >= 17 && h <= 20) return 1.2;
  return 1.0;
}

// ----- Promo codes -----

export type PromoResult = {
  code: string;
  type: "percent" | "flat";
  value: number;
  label: string;
};

export function evaluatePromo(rawCode: string): PromoResult | null {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  if (code === "FIRST10") return { code, type: "percent", value: 0.1, label: "10% off" };
  if (code === "SAVE500") return { code, type: "flat", value: 500, label: "₦500 off" };
  return null;
}

// ----- Pricing -----

export type PriceBreakdown = {
  base: number;
  perKm: number;
  distanceKm: number;
  multiplier: number;
  surge: number;
  manualSurge: number;
  stopsFee: number;       // extra per-stop fee (multi-stop only)
  stopsCount: number;     // number of stops billed
  subtotal: number;       // (base + km*rate + stopsFee) * weight * surge * manualSurge
  discount: number;       // amount actually deducted
  promoCode: string | null;
  promoLabel: string | null;
  minFare: number;
  total: number;          // final price the user pays
};

export function computeDeliveryPrice(opts: {
  vehicle: VehicleType;
  distanceKm: number;
  size: PackageSize;
  surge?: number;
  manualSurge?: number;
  promo?: PromoResult | null;
  /** Number of drop-off stops (multi-stop only). 0/1 = single delivery. */
  stopsCount?: number;
}): PriceBreakdown {
  const { base, perKm, minFare } = VEHICLE_PRICING[opts.vehicle];
  const multiplier = PACKAGE_SIZES[opts.size].multiplier;
  const surge = opts.surge ?? 1;
  const manualSurge = opts.manualSurge ?? 1;
  const stopsCount = opts.stopsCount ?? 0;
  const stopsFee = stopsCount > 1 ? stopsCount * PER_STOP_FEE : 0;

  const subtotal =
    (base + opts.distanceKm * perKm + stopsFee) * multiplier * surge * manualSurge;

  let discount = 0;
  if (opts.promo) {
    discount = opts.promo.type === "percent"
      ? subtotal * opts.promo.value
      : opts.promo.value;
  }

  const afterDiscount = subtotal - discount;
  const floored = Math.max(afterDiscount, minFare, ABSOLUTE_PRICE_FLOOR);
  const total = roundPrice(floored);

  return {
    base,
    perKm,
    distanceKm: opts.distanceKm,
    multiplier,
    surge,
    manualSurge,
    stopsFee,
    stopsCount,
    subtotal,
    discount: Math.max(0, Math.round(subtotal - afterDiscount)),
    promoCode: opts.promo?.code ?? null,
    promoLabel: opts.promo?.label ?? null,
    minFare,
    total,
  };
}
