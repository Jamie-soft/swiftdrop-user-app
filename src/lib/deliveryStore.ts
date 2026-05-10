import { useSyncExternalStore } from "react";
import type { PackageSize, PackageType } from "./pricing";

export type VehicleType = "bike" | "van" | "bulk";

export type DeliveryStop = {
  address: string;
  lat: number | null;
  lng: number | null;
  receiverName: string;
  receiverPhone: string;
};

export const emptyStop = (): DeliveryStop => ({
  address: "",
  lat: null,
  lng: null,
  receiverName: "",
  receiverPhone: "",
});

export type DeliveryState = {
  pickup: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoff: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  vehicle: VehicleType | null;
  senderName: string;
  senderWhatsapp: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  savePickup: boolean;
  saveDropoff: boolean;
  packageType: PackageType | null;
  packageTypeOther: string;
  packageSize: PackageSize | null;
  distanceKm: number | null;
  price: number | null;
  surgeMultiplier: number | null;
  discountAmount: number | null;
  promoCode: string | null;
  // Multi-stop (only used when vehicle === 'bulk')
  isMultiStop: boolean;
  stops: DeliveryStop[];
};

const initialState: DeliveryState = {
  pickup: "",
  pickupLat: null,
  pickupLng: null,
  dropoff: "",
  dropoffLat: null,
  dropoffLng: null,
  vehicle: null,
  senderName: "",
  senderWhatsapp: "",
  senderPhone: "",
  receiverName: "",
  receiverPhone: "",
  savePickup: false,
  saveDropoff: false,
  packageType: null,
  packageTypeOther: "",
  packageSize: null,
  distanceKm: null,
  price: null,
  surgeMultiplier: null,
  discountAmount: null,
  promoCode: null,
  isMultiStop: false,
  stops: [],
};

let state: DeliveryState = { ...initialState };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const deliveryStore = {
  get: () => state,
  set: (patch: Partial<DeliveryState>) => {
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

export function useDeliveryStore(): DeliveryState {
  return useSyncExternalStore(
    deliveryStore.subscribe,
    deliveryStore.get,
    deliveryStore.get,
  );
}

export const VEHICLE_PRICES: Record<VehicleType, string> = {
  bike: "₦6,000",
  van: "₦8,000",
  bulk: "Custom pricing",
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  bike: "Bike",
  van: "Van",
  bulk: "Bulk",
};
