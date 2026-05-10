import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useDeliveryStore, deliveryStore } from "@/lib/deliveryStore";

export const Route = createFileRoute("/delivery/sender")({
  head: () => ({
    meta: [
      { title: "Sender Details — SwiftDrop" },
      { name: "description", content: "Enter sender details for your delivery." },
    ],
  }),
  component: SenderPage,
});

function formatWhatsapp(input: string): string {
  // Strip non-digits, ensure +234 prefix
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("234")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return local ? `+234${local}` : "+234";
}

function SenderPage() {
  const navigate = useNavigate();
  const state = useDeliveryStore();
  const [name, setName] = useState(state.senderName);
  const [whatsapp, setWhatsapp] = useState(state.senderWhatsapp || "+234");
  const [phone, setPhone] = useState(state.senderPhone);

  const handleNext = () => {
    if (!name.trim()) return toast.error("Enter sender's full name");
    if (whatsapp.replace(/\D/g, "").length < 13)
      return toast.error("Enter a valid WhatsApp number");
    deliveryStore.set({
      senderName: name.trim(),
      senderWhatsapp: whatsapp,
      senderPhone: phone.trim(),
    });
    // Multi-stop already collected per-stop receivers — skip the receiver step.
    navigate({ to: state.isMultiStop ? "/delivery/summary" : "/delivery/receiver" });
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/delivery" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sender Details</h1>
          <p className="text-xs text-muted-foreground">Step 2 of 4</p>
        </div>
      </div>

      <div className="space-y-3">
        <Field label="Full Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="WhatsApp Number" required>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
            placeholder="+234 801 234 5678"
            inputMode="tel"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Phone Number (optional)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            inputMode="tel"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Field>
      </div>

      <button
        onClick={handleNext}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
      >
        Next
        <ArrowRight className="h-5 w-5" />
      </button>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
