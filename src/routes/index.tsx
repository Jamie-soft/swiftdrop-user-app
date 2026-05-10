import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Sparkles, Zap, Building2, ArrowRight, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwiftDrop — Fast & Reliable Delivery in Port Harcourt" },
      {
        name: "description",
        content:
          "Send packages or book a ride in minutes. SwiftDrop connects Port Harcourt with bike delivery, luxury rides, and lightning-fast response times.",
      },
      { property: "og:title", content: "SwiftDrop — Fast & Reliable Delivery in Port Harcourt" },
      {
        property: "og:description",
        content: "Send packages or book a ride in minutes across Port Harcourt.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { Icon: Bike, title: "Bike Delivery", desc: "Beat the traffic with quick two-wheeler drops." },
  { Icon: Sparkles, title: "Luxury Rides", desc: "Premium cars for meetings and special days." },
  { Icon: Zap, title: "Fast Response", desc: "Riders dispatched in under 5 minutes." },
  { Icon: Building2, title: "Built for Business", desc: "Bulk pickups and recurring deliveries." },
];

const steps = [
  { n: "01", title: "Book a service", desc: "Choose delivery or a ride in seconds." },
  { n: "02", title: "We assign a rider", desc: "Nearest verified rider gets matched." },
  { n: "03", title: "Rider contacts you", desc: "Coordinate pickup and you're moving." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-md px-6 pb-16 pt-14">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">SwiftDrop</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <MapPin className="h-3 w-3 text-primary" />
              Port Harcourt
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Now live across the city
          </div>

          <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.05] tracking-tight">
            Fast & Reliable{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">Delivery</span>{" "}
            in Port Harcourt
          </h1>

          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Send packages or book a ride in minutes. Trusted riders, transparent pricing, zero stress.
          </p>

          <Link
            to="/home"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              ["5min", "Avg pickup"],
              ["24/7", "Available"],
              ["10k+", "Deliveries"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-border bg-surface/50 px-2 py-3 backdrop-blur">
                <div className="font-display text-xl font-bold text-primary">{v}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-md px-6 py-14">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">What we offer</p>
        <h2 className="mb-8 text-2xl font-bold">Everything moves with SwiftDrop</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-gradient-surface p-4 shadow-card"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-md px-6 py-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
        <h2 className="mb-8 text-2xl font-bold">Three steps to move</h2>
        <div className="space-y-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="font-display text-2xl font-bold text-primary/60">{s.n}</div>
              <div className="flex-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-md px-6 pb-16 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-surface p-8 text-center shadow-card">
          <div className="absolute inset-0 bg-gradient-hero opacity-60" />
          <div className="relative">
            <h2 className="text-2xl font-bold leading-tight">
              Start your first <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">delivery today</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">
              Join thousands moving smarter across Port Harcourt.
            </p>
            <Link
              to="/home"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2026 SwiftDrop · Port Harcourt, Nigeria
        </p>
      </section>
    </div>
  );
}
