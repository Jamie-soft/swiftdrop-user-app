import { useState } from "react";
import { BookMarked, Loader2, X } from "lucide-react";
import { useAddresses, type Address } from "@/lib/addressesStore";

type Props = {
  onPick: (address: Address) => void;
  triggerLabel?: string;
};

/**
 * Small inline picker: a button that opens a dropdown listing the user's
 * saved addresses. Selecting one calls onPick and closes the panel.
 */
export function AddressPicker({ onPick, triggerLabel = "Saved" }: Props) {
  const { addresses, loading } = useAddresses();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25"
      >
        <BookMarked className="h-3 w-3" />
        {triggerLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs font-semibold">Saved addresses</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-surface"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No saved addresses yet.
              </div>
            ) : (
              addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onPick(a);
                    setOpen(false);
                  }}
                  className="block w-full border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface"
                >
                  <div className="text-xs font-semibold">{a.label}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">
                    {a.address}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
