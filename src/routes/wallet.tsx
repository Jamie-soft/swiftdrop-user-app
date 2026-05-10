import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useOrders, formatNaira } from "@/lib/ordersStore";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — SwiftDrop" },
      { name: "description", content: "Manage your SwiftDrop wallet balance." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const recent = orders.slice(0, 5);

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/profile" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-3xl border border-primary/30 bg-gradient-surface p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <WalletIcon className="h-5 w-5" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Wallet Balance
          </div>
        </div>
        <div className="mt-4 text-4xl font-bold text-primary">{formatNaira(25000)}</div>
        <p className="mt-2 text-xs text-muted-foreground">Available for rides and deliveries</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Top up
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.98]">
            <ArrowUpRight className="h-4 w-4" /> Withdraw
          </button>
        </div>
      </div>

      <h2 className="mb-3 mt-7 text-lg font-semibold">Recent activity</h2>
      <div className="space-y-2">
        <Row
          Icon={ArrowDownLeft}
          title="Wallet top-up"
          sub="Mon · 9:00 AM"
          amount="+₦10,000"
          positive
        />
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            No spending yet. Book a ride or delivery to get started.
          </p>
        ) : (
          recent.map((o) => (
            <Row
              key={o.id}
              Icon={ArrowUpRight}
              title={o.kind === "ride" ? "Ride payment" : "Delivery payment"}
              sub={new Date(o.createdAt).toLocaleString()}
              amount={`-${formatNaira(o.price)}`}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function Row({
  Icon,
  title,
  sub,
  amount,
  positive,
}: {
  Icon: typeof ArrowDownLeft;
  title: string;
  sub: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          positive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <div className={`text-sm font-semibold ${positive ? "text-primary" : "text-foreground"}`}>
        {amount}
      </div>
    </div>
  );
}
