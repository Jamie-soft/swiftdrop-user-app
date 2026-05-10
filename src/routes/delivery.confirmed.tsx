import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Hash, User, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { deliveryStore } from "@/lib/deliveryStore";
import { useOrders } from "@/lib/ordersStore";
import { useRider } from "@/lib/ridersStore";

export const Route = createFileRoute("/delivery/confirmed")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — SwiftDrop" },
      { name: "description", content: "Your delivery request has been received." },
    ],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const last = orders.find((o) => o.kind === "delivery");
  const { rider, loading: riderLoading } = useRider(last?.riderId ?? null);

  const handleHome = () => {
    deliveryStore.reset();
    navigate({ to: "/home" });
  };

  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <h1 className="mt-8 text-2xl font-bold">Request Received!</h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          A rider will contact you within 20 minutes to confirm your order.
        </p>

        {last && last.kind === "delivery" && (
          <div className="mt-6 w-full max-w-xs space-y-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Hash className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Order ID
                </div>
                <div className="text-sm font-semibold">{last.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned Rider
                </div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  {riderLoading ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Searching for rider…</>
                  ) : rider ? (
                    <>{rider.name} · {rider.phone}</>
                  ) : (
                    "Searching for rider…"
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleHome}
          className="mt-10 inline-flex w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow"
        >
          Back to Home
        </button>
      </div>
    </AppShell>
  );
}
