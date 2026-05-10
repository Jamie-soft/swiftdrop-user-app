import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Package,
  Car,
  MapPin,
  Phone,
  User,
  Bike,
  CheckCircle2,
  Circle,
  Loader2,
  Radio,
} from "lucide-react";
import { supabase, type OrderRow, type OrderStopRow } from "@/lib/supabase";
import { useRider } from "@/lib/ridersStore";
import { formatNaira, formatStatus, type OrderStatus } from "@/lib/ordersStore";
import { getStatusVisual, formatRelativeTime } from "@/lib/statusColors";
import { RouteMap } from "@/components/RouteMap";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title: "Order details — SwiftDrop" },
      { name: "description", content: "Track your SwiftDrop order in real time." },
    ],
  }),
  component: OrderDetailsPage,
});

const TIMELINE: OrderStatus[] = [
  "pending",
  "accepted",
  "picked_up",
  "on_the_way",
  "delivered",
];

function statusIndex(status: string): number {
  if (status === "completed") return TIMELINE.length - 1;
  if (status === "confirmed") return 1;
  const idx = TIMELINE.indexOf(status as OrderStatus);
  return idx === -1 ? 0 : idx;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function OrderDetailsPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [stops, setStops] = useState<OrderStopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [, setNowTick] = useState(0);
  const { rider, loading: riderLoading } = useRider(order?.rider_id ?? null);

  useEffect(() => {
    let cancelled = false;
    console.log("[order details] loading order id:", id);
    setLoading(true);
    setError(null);

    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          console.error("[order details] fetch failed", err);
          setError(err.message);
        } else if (!data) {
          setError("Order not found");
        } else {
          setOrder(data as OrderRow);
          setLastUpdated(Date.now());
        }
        setLoading(false);
      });

    const fetchStops = async () => {
      const { data, error: err } = await supabase
        .from("order_stops")
        .select("*")
        .eq("order_id", id)
        .order("stop_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        console.warn("[order details] order_stops fetch failed:", err.message);
        return;
      }
      setStops([...(data ?? [])] as OrderStopRow[]);
      setLastUpdated(Date.now());
    };

    // Initial stops fetch (best-effort; ignored if migration not applied).
    void fetchStops();

    const channel = supabase
      .channel(`order_stops-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          if (cancelled) return;
          console.log("[order details] realtime update", payload);
          setOrder((prev) => ({ ...(prev ?? {}), ...(payload.new as OrderRow) }));
          setLastUpdated(Date.now());
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_stops",
          filter: `order_id=eq.${id}`,
        },
        (payload) => {
          if (cancelled) return;
          console.log("[order details] order_stops realtime", payload);
          void fetchStops();
        },
      )
      .subscribe((status) => {
        console.log("[order details] channel status:", status);
      });

    // Polling fallback in case realtime fails or is rate-limited.
    const pollInterval = setInterval(() => {
      if (cancelled) return;
      void fetchStops();
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [id]);

  // Tick every 30s so "x mins ago" stays fresh.
  useEffect(() => {
    const interval = setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background pb-28">
        <div className="mx-auto max-w-md px-5 pt-8">
          <Link
            to="/activity"
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to activity
          </Link>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : error || !order ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
              {error ?? "Order not found"}
            </div>
          ) : (
            <OrderContent
              order={order}
              setOrder={setOrder}
              stops={stops}
              setStops={setStops}
              rider={rider}
              riderLoading={riderLoading}
              lastUpdated={lastUpdated}
            />
          )}
        </div>
        <BottomNav />
      </div>
    </RequireAuth>
  );
}

function OrderContent({
  order,
  setOrder,
  stops,
  setStops,
  rider,
  riderLoading,
  lastUpdated,
}: {
  order: OrderRow;
  setOrder: React.Dispatch<React.SetStateAction<OrderRow | null>>;
  stops: OrderStopRow[];
  setStops: React.Dispatch<React.SetStateAction<OrderStopRow[]>>;
  rider: ReturnType<typeof useRider>["rider"];
  riderLoading: boolean;
  lastUpdated: number;
}) {
  const isMultiStop = !!order.is_multi_stop;
  const allStops = stops;
  const Icon = order.kind === "delivery" ? Package : Car;
  const currentIdx = statusIndex(order.status);
  const visual = getStatusVisual(order.status);
  const updatedSource = order.updated_at ?? new Date(lastUpdated).toISOString();

  // Auto-scroll active step into view when status changes.
  const activeRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [order.status]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {order.kind === "delivery" ? "Delivery" : "Ride"} · {order.vehicle_type}
            </div>
            <div className="text-lg font-semibold">{formatNaira(Number(order.price) || 0)}</div>
            <div className="text-[11px] text-muted-foreground">
              {formatDateTime(order.created_at)}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${visual.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${visual.dot} ${visual.pulse ? "animate-pulse" : ""}`}
            />
            {formatStatus(order.status)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">ID · {order.id}</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
            <span>Updated {formatRelativeTime(updatedSource)}</span>
          </span>
        </div>
      </div>

      {/* Map */}
      <RouteMap
        pickup={
          order.pickup_lat != null && order.pickup_lng != null
            ? { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng), address: order.pickup_address }
            : null
        }
        dropoff={
          !isMultiStop && order.dropoff_lat != null && order.dropoff_lng != null
            ? { lat: Number(order.dropoff_lat), lng: Number(order.dropoff_lng), address: order.dropoff_address }
            : null
        }
        stops={
          isMultiStop
            ? stops
                .filter((s) => s.lat != null && s.lng != null)
                .map((s) => ({
                  lat: Number(s.lat),
                  lng: Number(s.lng),
                  address: s.address,
                  label: String(s.stop_order),
                }))
            : undefined
        }
      />

      {/* Route */}
      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Route</h2>
          {isMultiStop && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {allStops.length} stops
            </span>
          )}
        </div>

        {isMultiStop ? (
          <MultiStopRoute
            pickupAddress={order.pickup_address}
            stops={allStops}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="my-1 h-8 w-px bg-border" />
                <MapPin className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Pickup
                  </div>
                  <div className="text-sm">{order.pickup_address || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Drop-off
                  </div>
                  <div className="text-sm">{order.dropoff_address || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(order.distance_km != null || order.estimated_duration || order.package_type || order.package_size) && (
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Distance
              </div>
              <div className="text-sm font-semibold">
                {order.distance_km != null ? `${order.distance_km} km` : "Unavailable"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                ETA
              </div>
              <div className="text-sm font-semibold">
                {order.estimated_duration ?? "—"}
              </div>
            </div>
            {order.package_type && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Package
                </div>
                <div className="text-sm font-semibold capitalize">{order.package_type}</div>
              </div>
            )}
            {order.package_size && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Size
                </div>
                <div className="text-sm font-semibold capitalize">{order.package_size}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rider */}
      <div className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">
          {order.kind === "ride" ? "Driver" : "Rider"}
        </h2>
        {!order.rider_id ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching for {order.kind === "ride" ? "driver" : "rider"}…
          </div>
        ) : riderLoading && !rider ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : rider ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{rider.name}</div>
                <div className="text-[11px] text-muted-foreground capitalize">
                  {rider.vehicle_type}
                </div>
              </div>
              <Bike className="h-4 w-4 text-muted-foreground" />
            </div>
            <a
              href={`tel:${rider.phone}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              Call {order.kind === "ride" ? "driver" : "rider"} · {rider.phone}
            </a>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Rider details unavailable</div>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Status</h2>
          <span className="text-[10px] text-muted-foreground">
            Updated {formatRelativeTime(updatedSource)}
          </span>
        </div>
        <ol className="space-y-4">
          {TIMELINE.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const stepVisual = getStatusVisual(step);
            return (
              <li
                key={step}
                ref={active ? activeRef : null}
                className="flex items-start gap-3 transition-all duration-500"
              >
                <div className="flex flex-col items-center">
                  {done ? (
                    <CheckCircle2 className={`h-5 w-5 ${stepVisual.fg}`} />
                  ) : active ? (
                    <div className="relative h-5 w-5">
                      <div
                        className={`absolute inset-0 animate-ping rounded-full ${stepVisual.dot} opacity-60`}
                      />
                      <div
                        className={`relative h-5 w-5 rounded-full ${stepVisual.dot} ring-4 ${stepVisual.ring} shadow-lg`}
                      />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                  {idx < TIMELINE.length - 1 && (
                    <div
                      className={`mt-1 h-8 w-px transition-colors duration-500 ${
                        idx < currentIdx ? stepVisual.dot : "bg-border"
                      }`}
                    />
                  )}
                </div>
                <div className="pt-0.5">
                  <div
                    className={`text-sm font-medium transition-colors duration-300 ${
                      active
                        ? `${stepVisual.fg} font-semibold`
                        : done
                          ? "text-foreground/80"
                          : "text-muted-foreground"
                    }`}
                  >
                    {formatStatus(step)}
                  </div>
                  {active && (
                    <div className={`text-[11px] ${stepVisual.fg} animate-pulse`}>
                      In progress…
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function MultiStopRoute({
  pickupAddress,
  stops,
}: {
  pickupAddress: string;
  stops: OrderStopRow[];
}) {
  return (
    <div className="space-y-3">
      {/* Pickup */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/40">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pickup
          </div>
          <div className="text-sm truncate">{pickupAddress || "—"}</div>
        </div>
      </div>

      {/* Connector */}
      <div className="ml-3.5 h-3 w-px bg-border" />

      {/* Stops */}
      <ol className="space-y-3">
        {stops.map((s, i) => {
          const isFinal = i === stops.length - 1;
          return (
            <li key={s.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isFinal
                    ? "bg-red-500 text-white ring-2 ring-amber-400/60"
                    : "bg-red-500/90 text-white ring-2 ring-red-500/30"
                }`}
              >
                {s.stop_order}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Stop {s.stop_order}
                    {isFinal ? " · Final" : ""}
                  </div>
                </div>
                <div className="text-sm truncate">{s.address}</div>
                {(s.receiver_name || s.receiver_phone) && (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {s.receiver_name}
                    {s.receiver_phone ? ` · ${s.receiver_phone}` : ""}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}