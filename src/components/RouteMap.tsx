import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type ValidCoord = { lat: number; lng: number };

function isValidCoord<T extends { lat?: number | null; lng?: number | null }>(
  p: T | null | undefined,
): p is T & ValidCoord {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng)
  );
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAlbxR4f0mVFm1CMNlZW6B1wAMxwO5IkA0";
const SCRIPT_ID = "google-maps-js-sdk";

declare global {
  interface Window {
    google?: any;
    __gmapsLoading?: Promise<void>;
  }
}

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsLoading) return window.__gmapsLoading;

  window.__gmapsLoading = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });

  return window.__gmapsLoading;
}

export type RoutePoint = {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  /** Ignored for routing — kept for backward compatibility. */
  status?: "pending" | "delivered";
  label?: string;
};

type Props = {
  pickup: RoutePoint | null;
  /** Single drop-off (used when no `stops` are provided). */
  dropoff?: RoutePoint | null;
  /** Multi-stop drop-offs in order. Only the FIRST stop is used for routing. */
  stops?: RoutePoint[];
};

export function RouteMap({ pickup, dropoff, stops }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const rendererRef = useRef<any>(null);
  const hasRequestedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);

  // Stabilize the destination list — only changes when coordinates actually change.
  // This prevents real-time stop status updates from re-running map effects.
  const destsKey = JSON.stringify(
    (stops && stops.length > 0
      ? stops
      : dropoff
        ? [dropoff]
        : []
    ).map((d) => [d?.lat ?? null, d?.lng ?? null, d?.address ?? "", d?.label ?? ""]),
  );

  const stableDests = useMemo<RoutePoint[]>(() => {
    if (stops && stops.length > 0) return stops.filter(isValidCoord);
    if (dropoff && isValidCoord(dropoff)) return [dropoff];
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destsKey]);

  const firstStop = stableDests[0];
  const pickupValid = isValidCoord(pickup);
  const firstValid = isValidCoord(firstStop);
  const hasCoords = pickupValid && firstValid;

  // Load Google Maps + create map ONCE when valid coords first available.
  useEffect(() => {
    if (!hasCoords || !containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        try {
          const g = window.google;
          mapRef.current = new g.maps.Map(containerRef.current, {
            center: { lat: pickup!.lat, lng: pickup!.lng },
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            styles: [
              { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#1f2937" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#374151" }] },
              { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
            ],
          });
          setReady(true);
        } catch (e) {
          console.error("[RouteMap] map init failed", e);
          setError("Map unavailable");
        }
      })
      .catch((e) => {
        console.error("[RouteMap] failed to load", e);
        setError("Map unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [hasCoords]);

  // Draw markers + route ONCE per stable coord set. No status, no waypoints, no dynamic reroutes.
  useEffect(() => {
    if (!ready || !hasCoords || !mapRef.current) return;
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    const g = window.google;
    const map = mapRef.current;

    try {
      const pickupPos = { lat: pickup!.lat, lng: pickup!.lng };

      // Clear any previous markers (defensive — first render should be clean).
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // Pickup marker.
      markersRef.current.push(
        new g.maps.Marker({
          position: pickupPos,
          map,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
          title: pickup!.address ?? "Pickup",
        }),
      );

      // Drop-off markers.
      stableDests.forEach((d, i) => {
        if (!isValidCoord(d)) return;
        const isFinal = i === stableDests.length - 1 && stableDests.length > 1;
        markersRef.current.push(
          new g.maps.Marker({
            position: { lat: d.lat, lng: d.lng },
            map,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: isFinal ? 12 : 10,
              fillColor: isFinal ? "#dc2626" : "#ef4444",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
              labelOrigin: new g.maps.Point(0, 0),
            },
            label:
              stableDests.length > 1
                ? {
                    text: d.label ?? String(i + 1),
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "700",
                  }
                : undefined,
            title: d.address ?? `Stop ${i + 1}`,
          }),
        );
      });

      // Fit bounds to all markers.
      try {
        const bounds = new g.maps.LatLngBounds();
        bounds.extend(pickupPos);
        stableDests.forEach((d) => {
          if (isValidCoord(d)) bounds.extend({ lat: d.lat, lng: d.lng });
        });
        map.fitBounds(bounds, 60);
      } catch {
        map.setCenter(pickupPos);
      }

      // Single Directions request: pickup → first stop only.
      if (!isValidCoord(firstStop)) {
        setFallback(true);
        return;
      }

      try {
        rendererRef.current = new g.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: "#3b82f6",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        });

        const svc = new g.maps.DirectionsService();
        svc.route(
          {
            origin: pickupPos,
            destination: { lat: firstStop.lat, lng: firstStop.lng },
            travelMode: g.maps.TravelMode.DRIVING,
          },
          (result: any, status: string) => {
            try {
              if (status === "OK" && result && rendererRef.current) {
                rendererRef.current.setDirections(result);
              } else {
                console.warn("[RouteMap] Directions failed:", status);
                setFallback(true);
              }
            } catch (e) {
              console.error("[RouteMap] directions callback error", e);
              setFallback(true);
            }
          },
        );
      } catch (err) {
        console.error("[RouteMap] Directions failed", err);
        setFallback(true);
      }
    } catch (e) {
      console.error("[RouteMap] render failed; markers-only fallback", e);
      setFallback(true);
    }
  }, [ready, hasCoords]);

  if (!hasCoords || error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-3xl border border-border bg-surface text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="h-5 w-5 opacity-50" />
          {error ?? "Map unavailable"}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface">
      <div ref={containerRef} className="h-56 w-full sm:h-64" />
      {fallback && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow backdrop-blur">
          Showing markers only
        </div>
      )}
    </div>
  );
}
