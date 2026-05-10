import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — SwiftDrop" },
      { name: "description", content: "Frequently asked questions and contact options." },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  {
    q: "How long does a delivery take?",
    a: "Bike deliveries within Port Harcourt typically arrive in 15–30 minutes. Vans take 30–60 minutes depending on traffic.",
  },
  {
    q: "How is the price calculated?",
    a: "Each vehicle has a base fee plus a per-kilometer rate. Final price may vary based on traffic and demand.",
  },
  {
    q: "Can I schedule a delivery for later?",
    a: "Scheduled deliveries are coming soon. For now, all bookings are on-demand.",
  },
  {
    q: "How do I pay?",
    a: "You can pay from your in-app wallet. Card and bank transfer support is on the way.",
  },
  {
    q: "What if my rider is delayed?",
    a: "If a rider is delayed beyond the ETA, contact support and we will reassign your order.",
  },
];

function HelpPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/profile" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold">Help Center</h1>
      <p className="text-xs text-muted-foreground">Find answers and reach our team</p>

      <div className="mt-6 space-y-2">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <button
              key={i}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full rounded-2xl border border-border bg-surface p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 text-sm font-semibold">{f.q}</div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              {isOpen && (
                <p className="mt-2 text-xs text-muted-foreground">{f.a}</p>
              )}
            </button>
          );
        })}
      </div>

      <h2 className="mb-3 mt-7 text-lg font-semibold">Contact us</h2>
      <div className="space-y-2">
        <a
          href="tel:+2348000000000"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Phone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Call support</div>
            <div className="text-xs text-muted-foreground">+234 800 000 0000</div>
          </div>
        </a>
        <a
          href="mailto:help@swiftdrop.ng"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Email us</div>
            <div className="text-xs text-muted-foreground">help@swiftdrop.ng</div>
          </div>
        </a>
      </div>
    </AppShell>
  );
}
