import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/delivery/loading")({
  head: () => ({
    meta: [
      { title: "Finding rider — SwiftDrop" },
      { name: "description", content: "Searching for an available rider." },
    ],
  }),
  component: LoadingPage,
});

function LoadingPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"searching" | "busy">("searching");

  useEffect(() => {
    const t = setTimeout(() => setPhase("busy"), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        {phase === "searching" ? (
          <>
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-primary/20" />
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <h1 className="mt-8 text-2xl font-bold">Finding a rider...</h1>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Hold on while we connect you with the nearest available rider.
            </p>
          </>
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">All riders are currently busy.</h1>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              You can request a manual dispatch and our team will connect you to a rider shortly.
            </p>
            <button
              onClick={() => navigate({ to: "/delivery/confirmed" })}
              className="mt-8 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-glow"
            >
              Request Manually
            </button>
            <button
              onClick={() => navigate({ to: "/delivery/summary" })}
              className="mt-3 text-sm text-muted-foreground underline"
            >
              Go back
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
