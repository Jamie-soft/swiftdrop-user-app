import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Briefcase, MapPin, Plus, Trash2, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { addAddress, deleteAddress, useAddresses, type Address } from "@/lib/addressesStore";

export const Route = createFileRoute("/addresses")({
  head: () => ({
    meta: [
      { title: "Saved Addresses — SwiftDrop" },
      { name: "description", content: "Manage your saved pickup and drop-off addresses." },
    ],
  }),
  component: AddressesPage,
});

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("home")) return Home;
  if (l.includes("office") || l.includes("work")) return Briefcase;
  return MapPin;
}

function AddressesPage() {
  const navigate = useNavigate();
  const { addresses, loading, error, refresh } = useAddresses();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !address.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addAddress(label.trim(), address.trim());
      toast.success("Address saved");
      setLabel("");
      setAddress("");
      setShowForm(false);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save address");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (a: Address) => {
    if (deletingId) return;
    setDeletingId(a.id);
    try {
      await deleteAddress(a.id);
      toast.success("Address removed");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/profile" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold">Saved Addresses</h1>
      <p className="text-xs text-muted-foreground">Quickly book to your favorites</p>

      <div className="mt-6 space-y-2">
        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && addresses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No saved addresses yet. Add one below.
          </div>
        )}

        {!loading &&
          addresses.map((a) => {
            const Icon = iconFor(a.label);
            return (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-xs text-muted-foreground break-words">{a.address}</div>
                </div>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deletingId === a.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label="Delete address"
                >
                  {deletingId === a.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
      </div>

      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="mt-6 space-y-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Add new address</div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-elevated"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='Label (e.g. "Home")'
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            maxLength={40}
            required
          />
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full address"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            rows={2}
            maxLength={250}
            required
          />
          <button
            type="submit"
            disabled={!label.trim() || !address.trim() || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save address"}
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-primary active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Add new address
        </button>
      )}
    </AppShell>
  );
}
