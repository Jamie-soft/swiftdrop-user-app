import { useSyncExternalStore } from "react";

export type RideType = "standard" | "luxury" | "xl";

export type RideState = {
  pickup: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoff: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  rideType: RideType | null;
};

const initialState: RideState = {
  pickup: "",
  pickupLat: null,
  pickupLng: null,
  dropoff: "",
  dropoffLat: null,
  dropoffLng: null,
  rideType: null,
};

let state: RideState = { ...initialState };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const rideStore = {
  get: () => state,
  set: (patch: Partial<RideState>) => {
    state = { ...state, ...patch };
    emit();
  },
  reset: () => {
    state = { ...initialState };
    emit();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useRideStore(): RideState {
  return useSyncExternalStore(
    rideStore.subscribe,
    rideStore.get,
    rideStore.get,
  );
}

export const RIDE_PRICES: Record<RideType, string> = {
  standard: "₦2,800",
  luxury: "₦6,500",
  xl: "₦4,200",
};

export const RIDE_LABELS: Record<RideType, string> = {
  standard: "Standard",
  luxury: "Luxury",
  xl: "XL",
};
