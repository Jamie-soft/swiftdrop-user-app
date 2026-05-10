import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Car, ArrowRight, Bike, Sparkles, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — SwiftDrop" },
      { name: "description", content: "Your SwiftDrop dashboard. Book deliveries and rides." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Good day 👋</p>
        <h1 className="mt-1 text-3xl font-bold">Where to today?</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/delivery"
          className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-surface p-5 shadow-card transition-transform active:scale-[0.98]"
        >
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Package className="h-6 w-6" />
          </div>
          <div className="text-base font-semibold">Send a Package</div>
          <div className="mt-1 text-xs text-muted-foreground">Bike delivery</div>
          <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          to="/ride"
          className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-surface p-5 shadow-card transition-transform active:scale-[0.98]"
        >
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Car className="h-6 w-6" />
          </div>
          <div className="text-base font-semibold">Book a Ride</div>
          <div className="mt-1 text-xs text-muted-foreground">Luxury or standard</div>
          <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Quick services</h2>
        <div className="space-y-2">
          {[
            { Icon: Bike, title: "Express Bike", desc: "5-15 min pickup" },
            { Icon: Sparkles, title: "Luxury Ride", desc: "Premium vehicles" },
            { Icon: Clock, title: "Schedule Later", desc: "Plan ahead" },
          ].map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-surface p-6">
        <div className="absolute" />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Promo</div>
          <h3 className="mt-1 text-xl font-bold">Free first delivery</h3>
          <p className="mt-1 text-sm text-muted-foreground">Use code SWIFT10 at checkout.</p>
        </div>
      </section>
    </AppShell>
  );
}
