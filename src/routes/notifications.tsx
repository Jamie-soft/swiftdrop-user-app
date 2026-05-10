import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Tag, Truck, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SwiftDrop" },
      { name: "description", content: "Stay updated on your SwiftDrop activity." },
    ],
  }),
  component: NotificationsPage,
});

const notifications = [
  {
    Icon: Truck,
    title: "Delivery completed",
    body: "Your package to Trans Amadi has been delivered.",
    time: "2h ago",
    unread: true,
  },
  {
    Icon: Tag,
    title: "20% off your next ride",
    body: "Use code SWIFT20 — valid until Sunday.",
    time: "Yesterday",
    unread: true,
  },
  {
    Icon: Star,
    title: "Rate your last trip",
    body: "How was your ride with Femi B.?",
    time: "Mon",
  },
  {
    Icon: Bell,
    title: "Welcome to SwiftDrop",
    body: "Book your first delivery and get ₦1,000 off.",
    time: "Last week",
  },
];

function NotificationsPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/profile" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="text-xs text-muted-foreground">Recent alerts and updates</p>

      <div className="mt-6 space-y-2">
        {notifications.map((n, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              n.unread
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <n.Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">{n.title}</div>
                {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div className="text-xs text-muted-foreground">{n.body}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {n.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
