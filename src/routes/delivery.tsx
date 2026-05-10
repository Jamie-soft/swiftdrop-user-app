import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { MapPin, ArrowRight, Bike, Truck, Package, Plus, X, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AddressPicker } from "@/components/AddressPicker";
import {
  useDeliveryStore,
  deliveryStore,
  emptyStop,
  type DeliveryStop,
  type VehicleType,
} from "@/lib/deliveryStore";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import {
  PACKAGE_TYPES,
  PACKAGE_SIZES,
  computeDeliveryPrice,
  haversineKm,
  chainedDistanceKm,
  getTimeSurge,
  evaluatePromo,
  type PackageSize,
  type PackageType,
  type PromoResult,
} from "@/lib/pricing";
import { formatNaira } from "@/lib/ordersStore";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery — SwiftDrop" },
      { name: "description", content: "Send packages anywhere in Port Harcourt." },
    ],
  }),
  component: DeliveryPage,
});

const vehicles: { id: VehicleType; Icon: typeof Bike; title: string; desc: string; price: string }[] = [
  { id: "bike", Icon: Bike, title: "Bike", desc: "Up to 10kg · 15-30 min", price: "from ₦1,500" },
  { id: "van", Icon: Truck, title: "Van", desc: "Up to 200kg · 30-60 min", price: "from ₦3,000" },
  { id: "bulk", Icon: Package, title: "Bulk", desc: "Multiple stops", price: "from ₦5,000" },
];

function DeliveryPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const state = useDeliveryStore();
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
  const [vehicle, setVehicle] = useState<VehicleType | null>(state.vehicle);
  const [savePickup, setSavePickup] = useState(state.savePickup);
  const [saveDropoff, setSaveDropoff] = useState(state.saveDropoff);
  const [packageType, setPackageType] = useState<PackageType | null>(state.packageType);
  const [packageTypeOther, setPackageTypeOther] = useState(state.packageTypeOther);
  const [packageSize, setPackageSize] = useState<PackageSize | null>(state.packageSize);

  // "Bulk" is a delivery TYPE, not a vehicle. Multi-stop deliveries still use
  // the bike vehicle + bike pricing — `bulk` here is shorthand for "bike + multi-stop".
  const isMultiStop = vehicle === "bulk";
  // The actual vehicle persisted to the DB. Bulk maps back to "bike".
  const effectiveVehicle: VehicleType = isMultiStop ? "bike" : (vehicle ?? "bike");

  // Multi-stop list (used when isMultiStop). Always init with at least 2 stops.
  const [stops, setStops] = useState<DeliveryStop[]>(() =>
    state.stops.length >= 2 ? state.stops : [emptyStop(), emptyStop()],
  );

  // Compute distance from coords (no async, no flicker).
  const distanceKm = useMemo(() => {
    if (pickupCoords.lat == null || pickupCoords.lng == null) return null;

    if (isMultiStop) {
      const valid = stops.filter(
        (s) => s.lat != null && s.lng != null,
      ) as Array<DeliveryStop & { lat: number; lng: number }>;
      if (valid.length < 2) return null;
      const path = [
        { lat: pickupCoords.lat, lng: pickupCoords.lng },
        ...valid.map((s) => ({ lat: s.lat, lng: s.lng })),
      ];
      return Math.round(chainedDistanceKm(path) * 10) / 10;
    }

    if (dropoffCoords.lat == null || dropoffCoords.lng == null) return null;
    const km = haversineKm(
      { lat: pickupCoords.lat, lng: pickupCoords.lng },
      { lat: dropoffCoords.lat, lng: dropoffCoords.lng },
    );
    return Math.round(km * 10) / 10;
  }, [
    pickupCoords.lat,
    pickupCoords.lng,
    dropoffCoords.lat,
    dropoffCoords.lng,
    isMultiStop,
    stops,
  ]);

  // Promo code state
  const [promoInput, setPromoInput] = useState(state.promoCode ?? "");
  const [promo, setPromo] = useState<PromoResult | null>(() => evaluatePromo(state.promoCode ?? ""));
  const [promoStatus, setPromoStatus] = useState<"idle" | "valid" | "invalid">(
    state.promoCode && evaluatePromo(state.promoCode) ? "valid" : "idle",
  );

  // Time-based surge — refresh every minute so it stays current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const surge = useMemo(() => getTimeSurge(now), [now]);

  // Debounced pricing — only recomputes after 300ms of stable inputs.
  const [breakdown, setBreakdown] = useState<ReturnType<typeof computeDeliveryPrice> | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  useEffect(() => {
    if (distanceKm == null || !vehicle || !packageSize) {
      setBreakdown(null);
      setRecalculating(false);
      return;
    }
    setRecalculating(true);
    const stopsCount = isMultiStop ? stops.filter((s) => s.lat != null).length : 0;
    const t = setTimeout(() => {
      setBreakdown(
        computeDeliveryPrice({
          vehicle: effectiveVehicle,
          distanceKm,
          size: packageSize,
          surge,
          promo,
          stopsCount,
        }),
      );
      setRecalculating(false);
    }, 300);
    return () => clearTimeout(t);
  }, [distanceKm, vehicle, packageSize, surge, promo, isMultiStop, stops]);

  if (pathname !== "/delivery") {
    return <Outlet />;
  }

  const applyPromo = () => {
    const result = evaluatePromo(promoInput);
    setPromo(result);
    setPromoStatus(promoInput.trim() === "" ? "idle" : result ? "valid" : "invalid");
    if (promoInput.trim() && !result) toast.error("Invalid promo code");
    else if (result) toast.success(`Promo applied — ${result.label}`);
  };

  const clearPromo = () => {
    setPromoInput("");
    setPromo(null);
    setPromoStatus("idle");
  };

  const handleContinue = () => {
    if (!pickup.trim()) return toast.error("Enter a pickup address");
    if (!vehicle) return toast.error("Select a vehicle");

    let validStops: DeliveryStop[] = [];
    if (isMultiStop) {
      validStops = stops.map((s) => ({
        ...s,
        address: s.address.trim(),
        receiverName: s.receiverName.trim(),
        receiverPhone: s.receiverPhone.trim(),
      }));
      if (validStops.length < 2)
        return toast.error("Add at least 2 stops for bulk delivery");
      for (let i = 0; i < validStops.length; i++) {
        const s = validStops[i];
        if (!s.address) return toast.error(`Stop ${i + 1}: enter an address`);
        if (!s.receiverName) return toast.error(`Stop ${i + 1}: enter receiver name`);
        if (s.receiverPhone.replace(/\D/g, "").length < 10)
          return toast.error(`Stop ${i + 1}: enter a valid phone number`);
      }
    } else {
      if (!dropoff.trim()) return toast.error("Enter a drop-off address");
    }

    if (!packageType) return toast.error("Select a package type");
    if (packageType === "Other" && !packageTypeOther.trim())
      return toast.error("Describe your package");
    if (!packageSize) return toast.error("Select a package size");
    if (distanceKm == null)
      return toast.error("Pick locations from suggestions to compute distance");
    if (!breakdown) return toast.error("Calculating price…");

    // For multi-stop, fall back to first stop as the "primary" dropoff so
    // existing single-dropoff fields and views still display something useful.
    const primaryDropoff = isMultiStop ? validStops[0] : null;

    deliveryStore.set({
      pickup: pickup.trim(),
      pickupLat: pickupCoords.lat,
      pickupLng: pickupCoords.lng,
      dropoff: isMultiStop ? primaryDropoff!.address : dropoff.trim(),
      dropoffLat: isMultiStop ? primaryDropoff!.lat : dropoffCoords.lat,
      dropoffLng: isMultiStop ? primaryDropoff!.lng : dropoffCoords.lng,
      vehicle: effectiveVehicle,
      savePickup,
      saveDropoff: isMultiStop ? false : saveDropoff,
      packageType,
      packageTypeOther: packageType === "Other" ? packageTypeOther.trim() : "",
      packageSize,
      distanceKm,
      price: breakdown.total,
      surgeMultiplier: breakdown.surge * breakdown.manualSurge,
      discountAmount: breakdown.discount,
      promoCode: breakdown.promoCode,
      isMultiStop,
      stops: isMultiStop ? validStops : [],
      // Pre-fill receiver from first stop so summary stays consistent.
      receiverName: isMultiStop ? validStops[0].receiverName : state.receiverName,
      receiverPhone: isMultiStop ? validStops[0].receiverPhone : state.receiverPhone,
    });
    navigate({ to: "/delivery/sender" });
  };

  const finalPackageType =
    packageType === "Other" ? packageTypeOther.trim() || "Other" : packageType ?? "";

  return (
    <AppShell title="Delivery">
      <p className="mb-6 -mt-4 text-sm text-muted-foreground">
        Send a package across Port Harcourt
      </p>

      <div className="space-y-3 rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3 rounded-2xl bg-background/60 px-4 py-3">
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pickup
              </label>
              <AddressPicker
                onPick={(a) => {
                  setPickup(a.address);
                  setPickupCoords({ lat: null, lng: null });
                  setSavePickup(false);
                }}
              />
            </div>
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
              placeholder="Enter pickup address"
            />
            <label className="mt-1 flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={savePickup}
                onChange={(e) => setSavePickup(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Save this pickup address
            </label>
          </div>
        </div>
        {!isMultiStop && (
          <div className="flex items-start gap-3 rounded-2xl bg-background/60 px-4 py-3">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Drop-off
                </label>
                <AddressPicker
                  onPick={(a) => {
                    setDropoff(a.address);
                    setDropoffCoords({ lat: null, lng: null });
                    setSaveDropoff(false);
                  }}
                />
              </div>
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
                placeholder="Enter destination"
              />
              <label className="mt-1 flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={saveDropoff}
                  onChange={(e) => setSaveDropoff(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Save this drop-off address
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Multi-stop list */}
      {isMultiStop && (
        <div className="mt-4 rounded-3xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Stops</div>
              <div className="text-[11px] text-muted-foreground">
                {stops.length} stop{stops.length === 1 ? "" : "s"} · min 2 required
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStops((prev) => [...prev, emptyStop()])}
              className="inline-flex items-center gap-1 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add stop
            </button>
          </div>
          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <StopRow
                key={idx}
                index={idx}
                stop={stop}
                canRemove={stops.length > 2}
                canMoveUp={idx > 0}
                canMoveDown={idx < stops.length - 1}
                onChange={(patch) =>
                  setStops((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
                  )
                }
                onRemove={() =>
                  setStops((prev) => prev.filter((_, i) => i !== idx))
                }
                onMoveUp={() =>
                  setStops((prev) => {
                    const next = prev.slice();
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    return next;
                  })
                }
                onMoveDown={() =>
                  setStops((prev) => {
                    const next = prev.slice();
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    return next;
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Package type */}
      <h2 className="mb-3 mt-7 text-lg font-semibold">What are you sending?</h2>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Package type
        </label>
        <select
          value={packageType ?? ""}
          onChange={(e) => setPackageType((e.target.value || null) as PackageType | null)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">Select package type</option>
          {PACKAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {packageType === "Other" && (
          <input
            type="text"
            value={packageTypeOther}
            onChange={(e) => setPackageTypeOther(e.target.value)}
            placeholder="Describe your package"
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        )}
      </div>

      {/* Package size */}
      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Package size
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(PACKAGE_SIZES) as PackageSize[]).map((sz) => {
            const meta = PACKAGE_SIZES[sz];
            const selected = packageSize === sz;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => setPackageSize(sz)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  selected
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-semibold">{meta.label}</div>
                <div className="text-[10px] text-muted-foreground">{meta.helper}</div>
                <div className="mt-1 text-[10px] text-primary">×{meta.multiplier}</div>
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="mb-3 mt-7 text-lg font-semibold">Choose vehicle</h2>
      <div className="space-y-2">
        {vehicles.map((v) => {
          const selected = vehicle === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVehicle(v.id)}
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
                <div className="text-xs text-muted-foreground">{v.desc}</div>
              </div>
              <div className="text-right text-sm font-semibold text-primary">{v.price}</div>
            </button>
          );
        })}
      </div>

      {/* Promo code */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Promo code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoStatus("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyPromo())}
            placeholder="Enter code (e.g. FIRST10)"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
          />
          {promo ? (
            <button
              type="button"
              onClick={clearPromo}
              className="rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={applyPromo}
              className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Apply
            </button>
          )}
        </div>
        {promoStatus === "valid" && promo && (
          <div className="mt-2 text-[11px] font-medium text-emerald-500">
            ✓ {promo.code} — {promo.label}
          </div>
        )}
        {promoStatus === "invalid" && (
          <div className="mt-2 text-[11px] font-medium text-destructive">
            Invalid code. Try FIRST10 or SAVE500.
          </div>
        )}
      </div>

      {/* Live price preview */}
      <div className="mt-4 rounded-3xl border border-primary/30 bg-gradient-surface p-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Estimated price
          </div>
          {recalculating && (
            <div className="text-[10px] text-muted-foreground animate-pulse">Updating…</div>
          )}
        </div>
        {breakdown ? (
          <>
            <div className="mt-1 text-3xl font-bold text-primary tabular-nums transition-all">
              {formatNaira(breakdown.total)}
            </div>
            <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Base</span>
                <span className="tabular-nums">{formatNaira(breakdown.base)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Distance · {breakdown.distanceKm} km × {formatNaira(breakdown.perKm)}
                </span>
                <span className="tabular-nums">
                  {formatNaira(Math.round(breakdown.distanceKm * breakdown.perKm))}
                </span>
              </div>
              {breakdown.stopsFee > 0 && (
                <div className="flex justify-between">
                  <span>Stops · {breakdown.stopsCount} × ₦300</span>
                  <span className="tabular-nums">{formatNaira(breakdown.stopsFee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Size multiplier</span>
                <span className="tabular-nums">× {breakdown.multiplier}</span>
              </div>
              {breakdown.surge > 1 && (
                <div className="flex justify-between text-amber-500">
                  <span>Peak hours surge</span>
                  <span className="tabular-nums">× {breakdown.surge}</span>
                </div>
              )}
              {breakdown.discount > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>Discount{breakdown.promoCode ? ` (${breakdown.promoCode})` : ""}</span>
                  <span className="tabular-nums">−{formatNaira(Math.round(breakdown.discount))}</span>
                </div>
              )}
              {breakdown.total === breakdown.minFare && (
                <div className="flex justify-between text-muted-foreground/80">
                  <span>Minimum fare applied</span>
                  <span className="tabular-nums">{formatNaira(breakdown.minFare)}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-1 text-sm text-muted-foreground">
            {distanceKm == null
              ? "Pick locations from suggestions to compute distance."
              : !packageSize
                ? "Select a package size."
                : !vehicle
                  ? "Select a vehicle."
                  : "Calculating…"}
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={
          !pickup.trim() ||
          (!isMultiStop && !dropoff.trim()) ||
          (isMultiStop && stops.length < 2) ||
          !vehicle ||
          !packageType ||
          !packageSize ||
          !breakdown
        }
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
        {breakdown && (
          <span className="ml-1 text-sm font-semibold opacity-90">· {formatNaira(breakdown.total)}</span>
        )}
      </button>
      {/* keep finalPackageType referenced to avoid TS unused-var warning if linter strict */}
      <span className="hidden">{finalPackageType}</span>
    </AppShell>
  );
}

// ----- StopRow -----

type StopRowProps = {
  index: number;
  stop: DeliveryStop;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<DeliveryStop>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function StopRow({
  index,
  stop,
  canRemove,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: StopRowProps) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3 transition-all animate-in fade-in slide-in-from-top-1">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
            {index + 1}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stop {index + 1}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface disabled:opacity-30"
            aria-label="Move stop up"
          >
            <GripVertical className="h-3.5 w-3.5 -rotate-90" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface disabled:opacity-30"
            aria-label="Move stop down"
          >
            <GripVertical className="h-3.5 w-3.5 rotate-90" />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
              aria-label="Remove stop"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <PlacesAutocomplete
        value={stop.address}
        onChange={(text) => onChange({ address: text, lat: null, lng: null })}
        onSelect={(p) =>
          onChange({ address: p.address, lat: p.lat, lng: p.lng })
        }
        placeholder={`Stop ${index + 1} address`}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          value={stop.receiverName}
          onChange={(e) => onChange({ receiverName: e.target.value })}
          placeholder="Receiver name"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={stop.receiverPhone}
          onChange={(e) => onChange({ receiverPhone: e.target.value })}
          placeholder="Receiver phone"
          inputMode="tel"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
