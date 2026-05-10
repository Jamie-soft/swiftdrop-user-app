import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useDeliveryStore, deliveryStore } from "@/lib/deliveryStore";

export const Route = createFileRoute("/delivery/receiver")({
  head: () => ({
    meta: [
      { title: "Receiver Details — SwiftDrop" },
      { name: "description", content: "Enter receiver details for your delivery." },
    ],
  }),
  component: ReceiverPage,
});

function ReceiverPage() {
  const navigate = useNavigate();
  const state = useDeliveryStore();
  const [name, setName] = useState(state.receiverName);
  const [phone, setPhone] = useState(state.receiverPhone);

  const handleContinue = () => {
    if (!name.trim()) return toast.error("Enter receiver's name");
    if (phone.replace(/\D/g, "").length < 10)
      return toast.error("Enter a valid phone number");
    deliveryStore.set({
      receiverName: name.trim(),
      receiverPhone: phone.trim(),
    });
    navigate({ to: "/delivery/summary" });
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/delivery/sender" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Receiver Details</h1>
          <p className="text-xs text-muted-foreground">Step 3 of 4</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Receiver Name <span className="text-primary">*</span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="mt-1 w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Receiver Phone Number <span className="text-primary">*</span>
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            inputMode="tel"
            className="mt-1 w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </AppShell>
  );
}
