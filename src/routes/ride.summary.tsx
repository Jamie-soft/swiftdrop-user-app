import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Car, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useRideStore, RIDE_LABELS } from "@/lib/rideStore";
import {
  calcRidePrice,
  fakeDistanceKm,
  formatNaira,
  insertRideOrder,
} from "@/lib/ordersStore";
import { toast } from "sonner";

export const Route = createFileRoute("/ride/summary")({
  head: () => ({
    meta: [
      { title: "Ride Summary — SwiftDrop" },
      { name: "description", content: "Review your ride." },
    ],
  }),
  component: RideSummaryPage,
});

function RideSummaryPage() {
  const navigate = useNavigate();
  const s = useRideStore();
  const [submitting, setSubmitting] = useState(false);
  const distanceKm = useMemo(() => fakeDistanceKm(), []);

  if (!s.rideType) {
    return (
      <AppShell title="Ride Summary">
        <p className="text-sm text-muted-foreground">No ride in progress.</p>
        <button
          onClick={() => navigate({ to: "/ride" })}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-primary px-6 py-4 font-semibold text-primary-foreground"
        >
          Book a ride
        </button>
      </AppShell>
    );
  }

  const price = calcRidePrice(s.rideType, distanceKm);

  const handleRequest = async () => {
    if (submitting || !s.rideType) return;
    setSubmitting(true);
    try {
      await insertRideOrder({
        pickup: s.pickup,
        pickupLat: s.pickupLat,
        pickupLng: s.pickupLng,
        dropoff: s.dropoff,
        dropoffLat: s.dropoffLat,
        dropoffLng: s.dropoffLng,
        rideType: s.rideType,
        price,
      });
      navigate({ to: "/ride/loading" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to request ride");
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/ride" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ride Summary</h1>
        <p className="text-xs text-muted-foreground">Review your trip · {distanceKm} km</p>
      </div>

      <div className="space-y-3">
        <Row Icon={MapPin} label="Pickup" value={s.pickup} />
        <Row Icon={MapPin} label="Destination" value={s.dropoff} />
        <Row Icon={Car} label="Ride Type" value={RIDE_LABELS[s.rideType]} />
      </div>

      <div className="mt-6 rounded-3xl border border-primary/30 bg-gradient-surface p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Estimated Price
        </div>
        <div className="mt-1 text-3xl font-bold text-primary">{formatNaira(price)}</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Final price may vary based on traffic and demand.
        </p>
      </div>

      <button
        onClick={handleRequest}
        disabled={submitting}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Request Ride"}
      </button>
    </AppShell>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}
