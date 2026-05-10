import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Package, User, Users, Loader2, Ruler, Box } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDeliveryStore, VEHICLE_LABELS } from "@/lib/deliveryStore";
import { formatNaira, insertDeliveryOrder } from "@/lib/ordersStore";
import { PACKAGE_SIZES } from "@/lib/pricing";
import { saveAddressIfNew } from "@/lib/addressesStore";
import { toast } from "sonner";

export const Route = createFileRoute("/delivery/summary")({
  head: () => ({
    meta: [
      { title: "Order Summary — SwiftDrop" },
      { name: "description", content: "Review your delivery order." },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const navigate = useNavigate();
  const s = useDeliveryStore();
  const [submitting, setSubmitting] = useState(false);

  if (!s.vehicle || s.price == null || s.distanceKm == null) {
    return (
      <AppShell title="Summary">
        <p className="text-sm text-muted-foreground">No order in progress.</p>
        <button
          onClick={() => navigate({ to: "/delivery" })}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-primary px-6 py-4 font-semibold text-primary-foreground"
        >
          Start a delivery
        </button>
      </AppShell>
    );
  }

  const distanceKm = s.distanceKm;
  const price = s.price;
  const packageTypeDisplay =
    s.packageType === "Other" ? s.packageTypeOther || "Other" : s.packageType ?? "—";
  const sizeMeta = s.packageSize ? PACKAGE_SIZES[s.packageSize] : null;

  const handleRequest = async () => {
    if (submitting || !s.vehicle) return;
    setSubmitting(true);
    try {
      await insertDeliveryOrder({
        pickup: s.pickup,
        pickupLat: s.pickupLat,
        pickupLng: s.pickupLng,
        dropoff: s.dropoff,
        dropoffLat: s.dropoffLat,
        dropoffLng: s.dropoffLng,
        vehicle: s.vehicle,
        senderName: s.senderName,
        senderPhone: s.senderPhone || s.senderWhatsapp,
        receiverName: s.receiverName,
        receiverPhone: s.receiverPhone,
        price,
        finalPrice: price,
        distanceKm,
        packageType:
          s.packageType === "Other" ? s.packageTypeOther || "Other" : s.packageType,
        packageSize: s.packageSize,
        surgeMultiplier: s.surgeMultiplier ?? 1,
        discountAmount: s.discountAmount ?? 0,
        promoCode: s.promoCode ?? null,
        isMultiStop: s.isMultiStop,
        stops: s.isMultiStop
          ? s.stops.map((st) => ({
              address: st.address,
              lat: st.lat,
              lng: st.lng,
              receiverName: st.receiverName,
              receiverPhone: st.receiverPhone,
            }))
          : undefined,
      });

      const saves: Promise<void>[] = [];
      if (s.savePickup) saves.push(saveAddressIfNew("Pickup", s.pickup));
      if (s.saveDropoff && !s.isMultiStop)
        saves.push(saveAddressIfNew("Drop-off", s.dropoff));
      if (saves.length) {
        try {
          await Promise.all(saves);
        } catch (err) {
          console.warn("[delivery] address save failed:", err);
        }
      }

      navigate({ to: "/delivery/loading" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create order");
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/delivery/receiver" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Order Summary</h1>
        <p className="text-xs text-muted-foreground">Step 4 of 4 · Review your order</p>
      </div>

      <div className="space-y-3">
        <Row Icon={MapPin} label="Pickup" value={s.pickup} />
        {s.isMultiStop ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stops
              </div>
              <div className="text-[10px] text-muted-foreground">
                {s.stops.length} stops
              </div>
            </div>
            <ol className="space-y-2.5">
              {s.stops.map((stop, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{stop.address}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {stop.receiverName} · {stop.receiverPhone}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <Row Icon={MapPin} label="Drop-off" value={s.dropoff} />
        )}
        <Row Icon={Package} label="Vehicle" value={VEHICLE_LABELS[s.vehicle]} />
        <Row Icon={Ruler} label="Distance" value={`${distanceKm} km`} />
        <Row
          Icon={Box}
          label="Package"
          value={packageTypeDisplay}
          sub={sizeMeta ? `${sizeMeta.label} · ${sizeMeta.helper}` : undefined}
        />
        <Row Icon={User} label="Sender" value={s.senderName} sub={s.senderWhatsapp} />
        {!s.isMultiStop && (
          <Row Icon={Users} label="Receiver" value={s.receiverName} sub={s.receiverPhone} />
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-primary/30 bg-gradient-surface p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Estimated Price
        </div>
        <div className="mt-1 text-3xl font-bold text-primary">{formatNaira(price)}</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Final price may vary based on distance and traffic.
        </p>

      </div>

      <button
        onClick={handleRequest}
        disabled={submitting}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Request Delivery"}
      </button>
    </AppShell>
  );
}

function Row({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof MapPin;
  label: string;
  value: string;
  sub?: string;
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
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
