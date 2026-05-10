import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  User,
  Wallet,
  MapPin,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { deliveryStore } from "@/lib/deliveryStore";
import { rideStore } from "@/lib/rideStore";
import { signOut, useAuth } from "@/lib/authStore";
import { useProfile } from "@/lib/profileStore";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SwiftDrop" },
      { name: "description", content: "Manage your SwiftDrop account." },
    ],
  }),
  component: ProfilePage,
});

type Item = {
  Icon: typeof Wallet;
  title: string;
  sub: string;
  onClick: () => void;
};

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    try {
      await signOut();
      deliveryStore.reset();
      rideStore.reset();
      toast.success("Signed out");
      navigate({ to: "/auth/login" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to sign out");
    }
  };

  const groups: { label: string; items: Item[] }[] = [
    {
      label: "Account",
      items: [
        {
          Icon: Wallet,
          title: "Wallet & Payments",
          sub: "Cards, balance",
          onClick: () => navigate({ to: "/wallet" }),
        },
        {
          Icon: MapPin,
          title: "Saved Addresses",
          sub: "Home, Office",
          onClick: () => navigate({ to: "/addresses" }),
        },
        {
          Icon: Bell,
          title: "Notifications",
          sub: "Manage alerts",
          onClick: () => navigate({ to: "/notifications" }),
        },
      ],
    },
    {
      label: "Support",
      items: [
        {
          Icon: Shield,
          title: "Safety",
          sub: "Trusted contacts",
          onClick: () => toast.info("Safety settings coming soon"),
        },
        {
          Icon: HelpCircle,
          title: "Help Center",
          sub: "FAQs & contact",
          onClick: () => navigate({ to: "/help" }),
        },
      ],
    },
  ];

  return (
    <AppShell title="Profile">
      <div className="mb-7 flex items-center gap-4 rounded-3xl border border-border bg-gradient-surface p-5 shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
          <User className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-lg font-bold">
            {profile?.full_name || user?.email || "Account"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {user?.email ?? "Signed in"}
          </div>
          {profile?.phone && (
            <div className="truncate text-xs text-muted-foreground">{profile.phone}</div>
          )}
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            ⭐ 4.9 rating
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.label} className="mb-6">
          <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {g.label}
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {g.items.map((it, i) => (
              <button
                key={it.title}
                onClick={it.onClick}
                className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-elevated ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <it.Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.sub}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm font-semibold text-destructive transition-colors active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </AppShell>
  );
}
