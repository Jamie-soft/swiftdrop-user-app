import { Link, useLocation } from "@tanstack/react-router";
import { Home, Package, Car, Activity, User } from "lucide-react";

const items = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/delivery", label: "Delivery", Icon: Package },
  { to: "/ride", label: "Ride", Icon: Car },
  { to: "/activity", label: "Activity", Icon: Activity },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-xl shadow-nav">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
