// Shared status color tokens used across the app.
// Returns Tailwind utility classes for badges/chips and dot indicators.

export type StatusVisual = {
  badge: string; // background + text classes for pills
  dot: string; // bg color for small dot
  ring: string; // ring color for active timeline node
  fg: string; // text color
  pulse: boolean; // whether to animate (live states)
};

export function getStatusVisual(status: string): StatusVisual {
  switch (status) {
    case "pending":
      return {
        badge: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        ring: "ring-muted-foreground/40",
        fg: "text-muted-foreground",
        pulse: false,
      };
    case "accepted":
    case "confirmed":
      return {
        badge: "bg-blue-500/15 text-blue-400",
        dot: "bg-blue-500",
        ring: "ring-blue-500/40",
        fg: "text-blue-400",
        pulse: false,
      };
    case "picked_up":
      return {
        badge: "bg-orange-500/15 text-orange-400",
        dot: "bg-orange-500",
        ring: "ring-orange-500/40",
        fg: "text-orange-400",
        pulse: false,
      };
    case "on_the_way":
      return {
        badge: "bg-emerald-500/15 text-emerald-400",
        dot: "bg-emerald-500",
        ring: "ring-emerald-500/50",
        fg: "text-emerald-400",
        pulse: true,
      };
    case "delivered":
    case "completed":
      return {
        badge: "bg-green-600/20 text-green-400",
        dot: "bg-green-500",
        ring: "ring-green-500/50",
        fg: "text-green-400",
        pulse: false,
      };
    case "cancelled":
      return {
        badge: "bg-destructive/15 text-destructive",
        dot: "bg-destructive",
        ring: "ring-destructive/40",
        fg: "text-destructive",
        pulse: false,
      };
    default:
      return {
        badge: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        ring: "ring-muted-foreground/40",
        fg: "text-muted-foreground",
        pulse: false,
      };
  }
}

export function formatRelativeTime(input: string | number | Date): string {
  const ts = typeof input === "string" ? new Date(input).getTime() : typeof input === "number" ? input : input.getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}
