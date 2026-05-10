import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyAlbxR4f0mVFm1CMNlZW6B1wAMxwO5IkA0";

export type PlaceValue = {
  address: string;
  lat: number | null;
  lng: number | null;
};

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: PlaceValue) => void;
  placeholder?: string;
  /** Two-letter country codes to bias to. Defaults to ["ng"]. */
  countries?: string[];
  className?: string;
  rightSlot?: React.ReactNode;
};

/**
 * Real-world location picker using Google Places Autocomplete (New API).
 *
 * UX guarantees:
 * - Debounced fetch (350ms) while typing.
 * - In-flight requests are aborted on every keystroke and on selection.
 * - After a selection, the input is "locked" to the chosen address — no
 *   further autocomplete fetches fire until the user actively edits the text.
 * - No spinner / dropdown flicker after pick.
 */
export function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter address",
  countries = ["ng"],
  className = "",
  rightSlot,
}: Props) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiBroken, setApiBroken] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Once a place is chosen, we lock to that exact address string. Any
  // programmatic update to `value` matching this won't retrigger fetching.
  const lockedAddressRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced fetch of autocomplete suggestions
  useEffect(() => {
    // If the current value matches the last selected address, do not fetch.
    if (lockedAddressRef.current !== null && value === lockedAddressRef.current) {
      return;
    }
    // User edited away from the locked value → unlock and resume autocomplete.
    if (lockedAddressRef.current !== null && value !== lockedAddressRef.current) {
      lockedAddressRef.current = null;
    }

    if (apiBroken) return;
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // Cancel any in-flight request from a prior keystroke.
    abortRef.current?.abort();

    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        setLoading(true);
        const res = await fetch(
          "https://places.googleapis.com/v1/places:autocomplete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            },
            body: JSON.stringify({
              input: value,
              includedRegionCodes: countries,
              languageCode: "en",
              sessionToken: sessionTokenRef.current,
              locationBias: {
                circle: {
                  center: { latitude: 4.8156, longitude: 7.0498 },
                  radius: 50000.0,
                },
              },
            }),
            signal: controller.signal,
          },
        );
        // If we were aborted or a selection happened mid-flight, bail silently.
        if (controller.signal.aborted) return;
        if (!res.ok) {
          console.warn("[places] autocomplete failed:", res.status);
          setApiBroken(true);
          setSuggestions([]);
          return;
        }
        const json = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId: string;
              structuredFormat?: {
                mainText?: { text: string };
                secondaryText?: { text: string };
              };
              text?: { text: string };
            };
          }>;
        };
        if (controller.signal.aborted) return;
        const items: Suggestion[] = (json.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({
            placeId: p.placeId,
            primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          }));
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        console.warn("[places] autocomplete error:", err);
        setApiBroken(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, countries, apiBroken]);

  const handleSelect = async (s: Suggestion) => {
    const fullText = s.secondary ? `${s.primary}, ${s.secondary}` : s.primary;

    // Hard-stop any ongoing autocomplete work.
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;

    // Lock to the chosen address so the value-effect won't refetch.
    lockedAddressRef.current = fullText;
    setOpen(false);
    setSuggestions([]);
    setLoading(false);
    onChange(fullText);

    // Fetch place details for lat/lng (separate request, also abortable).
    const detailsController = new AbortController();
    abortRef.current = detailsController;
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(s.placeId)}?sessionToken=${sessionTokenRef.current}`,
        {
          headers: {
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "id,formattedAddress,location",
          },
          signal: detailsController.signal,
        },
      );
      sessionTokenRef.current = crypto.randomUUID();
      if (detailsController.signal.aborted) return;
      if (!res.ok) {
        console.warn("[places] details failed:", res.status);
        onSelect({ address: fullText, lat: null, lng: null });
        return;
      }
      const json = (await res.json()) as {
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      };
      if (detailsController.signal.aborted) return;
      const address = json.formattedAddress ?? fullText;
      // Update the lock to the canonical formatted address before pushing.
      lockedAddressRef.current = address;
      onChange(address);
      onSelect({
        address,
        lat: json.location?.latitude ?? null,
        lng: json.location?.longitude ?? null,
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      console.warn("[places] details error:", err);
      onSelect({ address: fullText, lat: null, lng: null });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Spinner only when actively loading AND not locked to a selection.
  const showSpinner = loading && lockedAddressRef.current === null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => {
            // Any manual edit invalidates the lock.
            lockedAddressRef.current = null;
            onChange(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && lockedAddressRef.current === null && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
        />
        {showSpinner ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          rightSlot
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-surface-elevated shadow-card"
        >
          {suggestions.map((s, i) => {
            const active = i === activeIndex;
            return (
              <li
                key={s.placeId}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-start gap-2 border-b border-border px-3 py-2.5 last:border-b-0 transition-colors ${
                  active ? "bg-surface" : "hover:bg-surface"
                }`}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{s.primary}</div>
                  {s.secondary && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {s.secondary}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
