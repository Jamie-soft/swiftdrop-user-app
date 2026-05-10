import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { MapPin, ArrowRight, Car, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useRideStore, rideStore, type RideType } from "@/lib/rideStore";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";

export const Route = createFileRoute("/ride")({
  head: () => ({
    meta: [
      { title: "Ride — SwiftDrop" },
      { name: "description", content: "Book a ride across Port Harcourt." },
    ],
  }),
  component: RidePage,
});

const rideOptions: {
  id: RideType;
  Icon: typeof Car;
  title: string;
  desc: string;
  eta: string;
  price: string;
}[] = [
  { id: "standard", Icon: Car, title: "Standard", desc: "4 seats · Comfortable", eta: "3 min", price: "from ₦800" },
  { id: "luxury", Icon: Sparkles, title: "Luxury", desc: "Premium · AC", eta: "5 min", price: "from ₦2,500" },
  { id: "xl", Icon: Users, title: "XL", desc: "6 seats · Group", eta: "8 min", price: "from ₦1,500" },
];

function RidePage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const state = useRideStore();
  const [pickup, setPickup] = useState(state.pickup);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: state.pickupLat,
    lng: state.pickupLng,
  });
  const [dropoff, setDropoff] = useState(state.dropoff);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: state.dropoffLat,
    lng: state.dropoffLng,
  });
  const [rideType, setRideType] = useState<RideType | null>(state.rideType);

  if (pathname !== "/ride") {
    return <Outlet />;
  }

  const handleRequest = () => {
    if (!pickup.trim()) return toast.error("Enter a pickup location");
    if (!dropoff.trim()) return toast.error("Enter a destination");
    if (!rideType) return toast.error("Select a ride type");
    rideStore.set({
      pickup: pickup.trim(),
      pickupLat: pickupCoords.lat,
      pickupLng: pickupCoords.lng,
      dropoff: dropoff.trim(),
      dropoffLat: dropoffCoords.lat,
      dropoffLng: dropoffCoords.lng,
      rideType,
    });
    navigate({ to: "/ride/summary" });
  };

  return (
    <AppShell title="Book a Ride">
      <p className="mb-6 -mt-4 text-sm text-muted-foreground">Where are you headed?</p>

      <div className="space-y-3 rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-background/60 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pickup
            </label>
            <PlacesAutocomplete
              value={pickup}
              onChange={(text) => {
                setPickup(text);
                setPickupCoords({ lat: null, lng: null });
              }}
              onSelect={(p) => {
                setPickup(p.address);
                setPickupCoords({ lat: p.lat, lng: p.lng });
              }}
              placeholder="Enter pickup location"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-background/60 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Destination
            </label>
            <PlacesAutocomplete
              value={dropoff}
              onChange={(text) => {
                setDropoff(text);
                setDropoffCoords({ lat: null, lng: null });
              }}
              onSelect={(p) => {
                setDropoff(p.address);
                setDropoffCoords({ lat: p.lat, lng: p.lng });
              }}
              placeholder="Where to?"
            />
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-7 text-lg font-semibold">Choose ride</h2>
      <div className="space-y-2">
        {rideOptions.map((v) => {
          const selected = rideType === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setRideType(v.id)}
              className={`flex w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  selected ? "bg-gradient-primary text-primary-foreground" : "bg-primary/15 text-primary"
                }`}
              >
                <v.Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{v.title}</div>
                <div className="text-xs text-muted-foreground">
                  {v.desc} · {v.eta} away
                </div>
              </div>
              <div className="text-sm font-semibold text-primary">{v.price}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleRequest}
        disabled={!pickup.trim() || !dropoff.trim() || !rideType}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        Request Ride
        <ArrowRight className="h-5 w-5" />
      </button>
    </AppShell>
  );
}
