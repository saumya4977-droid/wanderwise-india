import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { cities, cityBySlug } from "@/data/cities";
import { getLiveFare, type LiveFare } from "@/lib/fares.functions";

const searchSchema = z.object({
  links: z.string().optional(), // pipe-separated share URLs
});

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Compare fare estimates — Travel Bharat" },
      { name: "description", content: "Paste shared fare links to compare auto, taxi and bus estimates across cities and pickup times side by side." },
    ],
  }),
  component: ComparePage,
});

interface Parsed {
  raw: string;
  citySlug: string | null;
  cityName: string;
  km: number;
  pickupHour: number | undefined;
  pickupLabel: string;
  valid: boolean;
  error?: string;
}

function parseShareLink(input: string): Parsed {
  const raw = input.trim();
  const fail = (error: string): Parsed => ({
    raw, citySlug: null, cityName: "—", km: 0, pickupHour: undefined,
    pickupLabel: "—", valid: false, error,
  });
  if (!raw) return fail("Empty");

  let url: URL;
  try {
    url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://example.com");
  } catch {
    return fail("Not a valid URL");
  }

  const match = url.pathname.match(/\/cities\/([a-z0-9-]+)/);
  if (!match) return fail("Not a city share link");
  const slug = match[1];
  const city = cityBySlug(slug);
  if (!city) return fail(`Unknown city: ${slug}`);

  const kmRaw = url.searchParams.get("km");
  const km = kmRaw ? Number(kmRaw) : 8;
  if (!Number.isFinite(km) || km < 1 || km > 200) return fail("Invalid km");

  const pickupRaw = url.searchParams.get("pickup");
  const pickupHour = pickupRaw === null || pickupRaw === "" ? undefined : Number(pickupRaw);
  if (pickupHour !== undefined && (!Number.isInteger(pickupHour) || pickupHour < 0 || pickupHour > 23)) {
    return fail("Invalid pickup hour");
  }

  return {
    raw, citySlug: slug, cityName: `${city.name}, ${city.state}`,
    km, pickupHour,
    pickupLabel: pickupHour === undefined ? "Now" : `${String(pickupHour).padStart(2, "0")}:00`,
    valid: true,
  };
}

function ComparePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const fetchFare = useServerFn(getLiveFare);

  const initialLinks = useMemo(() => {
    const fromUrl = (search.links ?? "").split("|").map((s) => s.trim()).filter(Boolean);
    if (fromUrl.length >= 2) return [...fromUrl, ...Array(Math.max(0, 2 - fromUrl.length)).fill("")];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      `${origin}/cities/${cities[0]?.slug ?? "jaipur"}?km=8&tab=Transport`,
      `${origin}/cities/${cities[1]?.slug ?? "mumbai"}?km=8&pickup=22&tab=Transport`,
    ];
  }, [search.links]);

  const [inputs, setInputs] = useState<string[]>(initialLinks);

  const parsed = useMemo(() => inputs.map(parseShareLink), [inputs]);

  const queries = useQueries({
    queries: parsed.map((p) => ({
      queryKey: ["compare-fare", p.citySlug, p.km, p.pickupHour ?? "now"],
      queryFn: () => fetchFare({ data: { citySlug: p.citySlug!, km: p.km, ...(p.pickupHour !== undefined ? { pickupHour: p.pickupHour } : {}) } }),
      enabled: p.valid,
      staleTime: 60_000,
    })),
  });

  const updateInput = (i: number, value: string) => {
    setInputs((arr) => arr.map((v, idx) => (idx === i ? value : v)));
  };
  const addRow = () => setInputs((arr) => (arr.length >= 5 ? arr : [...arr, ""]));
  const removeRow = (i: number) => setInputs((arr) => (arr.length <= 2 ? arr : arr.filter((_, idx) => idx !== i)));

  const syncToUrl = () => {
    const joined = inputs.filter(Boolean).join("|");
    navigate({ search: { links: joined || undefined }, replace: true });
  };

  const copyShareLink = async () => {
    const url = new URL(typeof window !== "undefined" ? window.location.href : "");
    url.searchParams.set("links", inputs.filter(Boolean).join("|"));
    await navigator.clipboard.writeText(url.toString());
  };

  // Find cheapest per mode for highlighting
  const cheapest = useMemo(() => {
    const fares = queries.map((q) => q.data as LiveFare | undefined);
    const min = (vals: (number | undefined)[]) => {
      const filtered = vals.map((v, i) => ({ v, i })).filter((x) => typeof x.v === "number") as { v: number; i: number }[];
      if (filtered.length === 0) return -1;
      return filtered.reduce((m, x) => (x.v < (filtered[m]?.v ?? Infinity) ? x.i : m), filtered[0].i);
    };
    return {
      auto: min(fares.map((f) => f?.auto.total)),
      taxi: min(fares.map((f) => f?.taxi.total)),
      bus: min(fares.map((f) => f?.bus.min)),
    };
  }, [queries]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <span className="eyebrow text-saffron">Side-by-side</span>
      <h1 className="display mt-2 text-5xl text-primary">Compare fare estimates</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Paste two or more shared fare links (from any city page's Transport tab) to see auto, taxi and bus estimates next to each other — the lowest for each mode is highlighted.
      </p>

      <div className="mt-8 space-y-3 rounded-2xl border border-border bg-card p-6">
        {inputs.map((value, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={value}
              onChange={(e) => updateInput(i, e.target.value)}
              placeholder="https://…/cities/jaipur?km=8&pickup=22&tab=Transport"
              className="flex-1 rounded-lg border border-border bg-background p-2 text-sm"
            />
            <button
              onClick={() => removeRow(i)}
              disabled={inputs.length <= 2}
              className="rounded-full border border-border px-3 text-xs hover:border-saffron hover:text-saffron disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={addRow} disabled={inputs.length >= 5} className="rounded-full border border-border px-4 py-1.5 text-xs hover:border-primary hover:text-primary disabled:opacity-40">
            + Add link
          </button>
          <button onClick={syncToUrl} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">
            Update comparison
          </button>
          <button onClick={copyShareLink} className="rounded-full border border-border px-4 py-1.5 text-xs hover:border-teal-deep hover:text-teal-deep">
            Copy comparison link
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(parsed.length, 4)}, minmax(0, 1fr))` }}>
        {parsed.map((p, i) => {
          const q = queries[i];
          const fare = q.data as LiveFare | undefined;
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="eyebrow text-teal-deep">Option {i + 1}</div>
              <h3 className="display mt-1 text-2xl text-primary">{p.cityName}</h3>
              {!p.valid && <p className="mt-2 text-xs text-saffron">{p.error}</p>}
              {p.valid && (
                <>
                  <div className="mt-1 text-xs text-muted-foreground">{p.km} km · Pickup {p.pickupLabel}</div>
                  {q.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading fare…</p>}
                  {q.isError && <p className="mt-4 text-sm text-saffron">Failed to load fare.</p>}
                  {fare && (
                    <div className="mt-4 space-y-3 text-sm">
                      <FareRow label="Auto" total={fare.auto.total} hi={cheapest.auto === i} />
                      <FareRow label="Taxi" total={fare.taxi.total} hi={cheapest.taxi === i} />
                      <div className={`flex justify-between rounded-lg px-2 py-1 ${cheapest.bus === i ? "bg-saffron/15 text-saffron" : ""}`}>
                        <span>Bus</span>
                        <span className="font-medium">₹{fare.bus.min}–{fare.bus.max}</span>
                      </div>
                      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                        Surge ×{fare.surge.toFixed(2)} · {fare.peak ? "Peak" : fare.nightCharge ? "Night" : "Off-peak"}
                        {fare.overrideApplied && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px]">Custom rates</span>}
                      </div>
                      <Link to="/cities/$slug" params={{ slug: p.citySlug! }} search={{ km: p.km, pickup: p.pickupHour, tab: "Transport" }} className="mt-2 inline-block text-xs text-primary underline">
                        Open city page →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FareRow({ label, total, hi }: { label: string; total: number; hi: boolean }) {
  return (
    <div className={`flex justify-between rounded-lg px-2 py-1 ${hi ? "bg-saffron/15 text-saffron" : ""}`}>
      <span>{label}</span>
      <span className="font-medium">₹{total}</span>
    </div>
  );
}
