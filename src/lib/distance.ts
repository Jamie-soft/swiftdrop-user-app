import { haversineKm, chainedDistanceKm } from "./pricing";

export type LatLng = { lat: number; lng: number };

const AVG_SPEED_KMH = 30; // urban average for ETA estimation

function isCoord(p: { lat: number | null | undefined; lng: number | null | undefined }): p is LatLng {
  return typeof p.lat === "number" && typeof p.lng === "number" && isFinite(p.lat) && isFinite(p.lng);
}

export function formatDuration(km: number): string {
  if (!isFinite(km) || km <= 0) return "—";
  const mins = Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Compute the distance + estimated duration for an order.
 * Returns nulls when coordinates are missing/invalid — the UI must show
 * "Distance unavailable" instead of 0.0 km in that case.
 */
export function computeOrderDistance(opts: {
  pickup: { lat: number | null; lng: number | null };
  dropoff?: { lat: number | null; lng: number | null } | null;
  stops?: Array<{ lat: number | null; lng: number | null }>;
}): { distanceKm: number | null; estimatedDuration: string | null } {
  try {
    if (!isCoord(opts.pickup)) return { distanceKm: null, estimatedDuration: null };

    const validStops = (opts.stops ?? []).filter(isCoord) as LatLng[];

    let km: number | null = null;
    if (validStops.length >= 1) {
      km = chainedDistanceKm([opts.pickup, ...validStops]);
    } else if (opts.dropoff && isCoord(opts.dropoff)) {
      km = haversineKm(opts.pickup, opts.dropoff);
    }

    if (km == null || !isFinite(km) || km <= 0) {
      return { distanceKm: null, estimatedDuration: null };
    }
    const rounded = Math.round(km * 10) / 10;
    return { distanceKm: rounded, estimatedDuration: formatDuration(rounded) };
  } catch (err) {
    console.warn("[distance] compute failed:", err);
    return { distanceKm: null, estimatedDuration: null };
  }
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || !isFinite(km as number) || (km as number) <= 0) return "Distance unavailable";
  return `${km} km`;
}
