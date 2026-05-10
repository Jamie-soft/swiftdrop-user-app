// Demo helpers: randomized rider names + simulated status progression.
// Purely client-side — does not mutate the database.

const RIDER_NAMES = [
  "Tunde A.",
  "Chinedu O.",
  "Bisi K.",
  "Emeka N.",
  "Fatima Y.",
  "Ifeanyi E.",
  "Zainab M.",
  "Olumide S.",
  "Ngozi U.",
  "Sade B.",
];

// Stable pseudo-random pick keyed off the order id so the same order
// always shows the same rider across renders.
export function riderForOrder(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % RIDER_NAMES.length;
  return RIDER_NAMES[idx];
}

export type DemoStatus = "pending" | "accepted" | "on the way" | "completed" | "cancelled";

// Simulate progression based on age of order:
//  0–20s   → pending
//  20–60s  → accepted
//  60s+    → on the way
// Completed/cancelled orders are passed through untouched.
export function simulatedStatus(rawStatus: string, createdAt: number): DemoStatus {
  if (rawStatus === "completed") return "completed";
  if (rawStatus === "cancelled") return "cancelled";
  const ageMs = Date.now() - createdAt;
  if (ageMs < 20_000) return "pending";
  if (ageMs < 60_000) return "accepted";
  return "on the way";
}
