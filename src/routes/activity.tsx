import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Car, CheckCircle2, Clock, Inbox, User, MapPin, Wallet, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useOrders, formatNaira, formatStatus, type Order } from "@/lib/ordersStore";
import { VEHICLE_LABELS } from "@/lib/deliveryStore";
import { RIDE_LABELS } from "@/lib/rideStore";
import { useRidersByIds } from "@/lib/ridersStore";
import { getStatusVisual } from "@/lib/statusColors";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — SwiftDrop" },
      { name: "description", content: "Your SwiftDrop trip and delivery history." },
    ],
  }),
  component: ActivityPage,
});

type Filter = "all" | "active" | "delivered";

const ACTIVE_STATUSES = new Set(["pending", "accepted", "picked_up", "on_the_way"]);
const DELIVERED_STATUSES = new Set(["delivered", "completed"]);

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
}

function titleFor(o: Order): string {
  if (o.kind === "delivery") return `${VEHICLE_LABELS[o.vehicle]} Delivery`;
  return `${RIDE_LABELS[o.rideType]} Ride`;
}

function progressPercent(status: string): number {
  switch (status) {
    case "pending": return 10;
    case "accepted": return 35;
    case "picked_up": return 65;
    case "on_the_way": return 85;
    case "delivered":
    case "completed": return 100;
    default: return 0;
  }
}

function ActivityPage() {
  const { orders, loading, error } = useOrders();
  const ridersMap = useRidersByIds(orders.map((o) => o.riderId));
  const [filter, setFilter] = useState<Filter>("all");

  const active = useMemo(() => orders.filter((o) => ACTIVE_STATUSES.has(o.status)), [orders]);
  const delivered = useMemo(() => orders.filter((o) => DELIVERED_STATUSES.has(o.status)), [orders]);

  const filtered =
    filter === "active" ? active : filter === "delivered" ? delivered : orders;

  const stats = useMemo(() => {
    const now = new Date();
    const monthCount = delivered.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const spent = delivered.reduce((sum, o) => sum + (o.price || 0), 0);
    return { total: delivered.length, monthCount, spent };
  }, [delivered]);

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: orders.length },
    { id: "active", label: "Active", count: active.length },
    { id: "delivered", label: "Delivered", count: delivered.length },
  ];

  return (
    <AppShell title="Activity">
      <div className="mb-5 flex gap-2">
        {tabs.map((t) => {
          const isActive = filter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border border-border bg-surface text-muted-foreground"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? "bg-white/20" : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {filter === "delivered" && !loading && delivered.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={String(stats.total)} />
          <StatCard icon={<CalendarDays className="h-4 w-4" />} label="This Month" value={String(stats.monthCount)} />
          <StatCard icon={<Wallet className="h-4 w-4" />} label="Spent" value={formatNaira(stats.spent)} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
                <div className="h-2 w-1/3 rounded bg-muted" />
              </div>
              <div className="h-4 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load orders: {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const rider = o.riderId ? ridersMap[o.riderId] : null;
            const isDelivered = DELIVERED_STATUSES.has(o.status);
            return isDelivered ? (
              <DeliveredCard key={o.id} order={o} riderName={rider?.name ?? null} />
            ) : (
              <ActiveCard key={o.id} order={o} riderName={rider?.name ?? null} />
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-base font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const message =
    filter === "active"
      ? "No active deliveries"
      : filter === "delivered"
      ? "No completed deliveries yet"
      : "No activity yet";
  const sub =
    filter === "delivered"
      ? "Your completed orders will appear here."
      : "Place your first order to get started.";
  return (
    <div className="flex flex-col items-center rounded-3xl border border-border bg-surface p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Inbox className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{message}</h2>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{sub}</p>
      {filter !== "delivered" && (
        <div className="mt-5 flex gap-2">
          <Link
            to="/delivery"
            className="rounded-2xl bg-gradient-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            Send a package
          </Link>
          <Link
            to="/ride"
            className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-foreground"
          >
            Book a ride
          </Link>
        </div>
      )}
    </div>
  );
}

function ActiveCard({ order: o, riderName }: { order: Order; riderName: string | null }) {
  const Icon = o.kind === "delivery" ? Package : Car;
  const visual = getStatusVisual(o.status);
  const pct = progressPercent(o.status);
  const title = o.kind === "delivery" ? VEHICLE_LABELS[o.vehicle] + " Delivery" : RIDE_LABELS[o.rideType] + " Ride";
  return (
    <Link
      to="/order/$id"
      params={{ id: o.id }}
      className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm">{title}</div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${visual.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${visual.dot} ${visual.pulse ? "animate-pulse" : ""}`} />
              {formatStatus(o.status)}
            </span>
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{o.pickup}</span></div>
            <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0 text-primary" /><span className="truncate">{o.dropoff}</span></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{riderName ?? "Searching for rider…"}</span>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${visual.dot} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatWhen(o.createdAt)}</span>
            <span className="font-semibold text-foreground">{formatNaira(o.price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DeliveredCard({ order: o, riderName }: { order: Order; riderName: string | null }) {
  const Icon = o.kind === "delivery" ? Package : Car;
  const title = o.kind === "delivery" ? VEHICLE_LABELS[o.vehicle] + " Delivery" : RIDE_LABELS[o.rideType] + " Ride";
  const parcel = o.kind === "delivery" ? (o as any).packageType : null;
  return (
    <Link
      to="/order/$id"
      params={{ id: o.id }}
      className="block rounded-2xl border border-border/60 bg-surface/60 p-4 opacity-90 transition-opacity hover:opacity-100"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm text-muted-foreground">{title}</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-600/15 px-2 py-0.5 text-[10px] font-semibold text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Delivered
            </span>
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{o.pickup}</span></div>
            <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{o.dropoff}</span></div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{riderName ?? "—"}</span>
            {parcel && <span className="rounded-full bg-muted px-2 py-0.5">{parcel}</span>}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatWhen(o.createdAt)}</span>
            <span className="font-semibold text-foreground">{formatNaira(o.price)}</span>
          </div>
          <div className="mt-1.5 text-[10px] font-medium text-green-500">Completed Successfully</div>
        </div>
      </div>
    </Link>
  );
}
