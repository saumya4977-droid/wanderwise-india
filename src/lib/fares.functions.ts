import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cityBySlug } from "@/data/cities";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface FareLeg {
  base: number;
  perKm: number;
  km: number;
  subtotal: number;       // base + perKm*km, pre-surge
  surgeAmount: number;    // subtotal * (surge - 1)
  total: number;          // subtotal * surge
}

export interface LiveFare {
  citySlug: string;
  km: number;
  pickupHour: number;     // 0-23 IST hour used for the calculation
  auto: FareLeg;
  taxi: FareLeg;
  bus: { min: number; max: number };
  surge: number;
  peak: boolean;
  nightCharge: boolean;
  peakMultiplier: number;
  nightMultiplier: number;
  source: "live" | "provider" | "fallback";
  overrideApplied: boolean;
  fetchedAt: string;
  cachedFor: number;
  note: string;
}

const CITY_RATES: Record<string, { autoBase: number; autoKm: number; taxiBase: number; taxiKm: number; busMin: number; busMax: number }> = {
  mumbai:    { autoBase: 26, autoKm: 17, taxiBase: 160, taxiKm: 20, busMin: 5,  busMax: 50  },
  jaipur:    { autoBase: 25, autoKm: 14, taxiBase: 150, taxiKm: 18, busMin: 10, busMax: 60  },
  ladakh:    { autoBase: 40, autoKm: 22, taxiBase: 250, taxiKm: 28, busMin: 20, busMax: 200 },
  manali:    { autoBase: 30, autoKm: 18, taxiBase: 200, taxiKm: 22, busMin: 15, busMax: 120 },
  varanasi:  { autoBase: 20, autoKm: 12, taxiBase: 140, taxiKm: 16, busMin: 10, busMax: 50  },
};
const DEFAULT_RATES = { autoBase: 25, autoKm: 14, taxiBase: 150, taxiKm: 18, busMin: 15, busMax: 120 };
const DEFAULT_PEAK = 1.3;
const DEFAULT_NIGHT = 1.5;

type CacheEntry = { value: LiveFare; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function buildLeg(base: number, perKm: number, km: number, surge: number): FareLeg {
  const subtotal = base + perKm * km;
  const total = Math.round(subtotal * surge);
  return {
    base,
    perKm,
    km,
    subtotal: Math.round(subtotal),
    surgeAmount: Math.round(subtotal * (surge - 1)),
    total,
  };
}

async function loadOverride(citySlug: string) {
  try {
    const { data } = await supabaseAdmin
      .from("fare_overrides")
      .select("*")
      .eq("city_slug", citySlug)
      .maybeSingle();
    return data;
  } catch (err) {
    console.error("Failed to load fare override:", err);
    return null;
  }
}

function resolveHour(pickupHour?: number): number {
  if (typeof pickupHour === "number" && pickupHour >= 0 && pickupHour < 24) return pickupHour;
  const now = new Date();
  return (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
}

async function computeLiveFare(citySlug: string, km: number, pickupHour: number | undefined): Promise<LiveFare> {
  const override = await loadOverride(citySlug);
  const base = CITY_RATES[citySlug] ?? DEFAULT_RATES;
  const rates = {
    autoBase: override?.auto_base ?? base.autoBase,
    autoKm:   override?.auto_per_km ?? base.autoKm,
    taxiBase: override?.taxi_base ?? base.taxiBase,
    taxiKm:   override?.taxi_per_km ?? base.taxiKm,
    busMin:   override?.bus_min ?? base.busMin,
    busMax:   override?.bus_max ?? base.busMax,
  };
  const peakMultiplier = Number(override?.peak_multiplier ?? DEFAULT_PEAK);
  const nightMultiplier = Number(override?.night_multiplier ?? DEFAULT_NIGHT);

  const hour = resolveHour(pickupHour);
  const peak = (hour >= 8 && hour < 11) || (hour >= 17 && hour < 21);
  const nightCharge = hour >= 23 || hour < 5;

  let surge = 1.0;
  if (peak) surge = peakMultiplier;
  if (nightCharge) surge = nightMultiplier;

  return {
    citySlug,
    km,
    pickupHour: hour,
    auto: buildLeg(Number(rates.autoBase), Number(rates.autoKm), km, surge),
    taxi: buildLeg(Number(rates.taxiBase), Number(rates.taxiKm), km, surge),
    bus: { min: Number(rates.busMin), max: Number(rates.busMax) },
    surge,
    peak,
    nightCharge,
    peakMultiplier,
    nightMultiplier,
    source: "live",
    overrideApplied: !!override,
    fetchedAt: new Date().toISOString(),
    cachedFor: TTL_MS / 1000,
    note: nightCharge
      ? `Night surcharge (11 PM – 5 AM) ×${nightMultiplier.toFixed(2)}`
      : peak
        ? `Peak-hour surge ×${peakMultiplier.toFixed(2)}`
        : "Off-peak — standard fares.",
  };
}

function staticFallback(citySlug: string, km: number, pickupHour: number | undefined): LiveFare {
  const city = cityBySlug(citySlug);
  const parse = (s: string | undefined, bF: number, kF: number) => {
    if (!s) return { base: bF, perKm: kF };
    const bm = s.match(/₹\s*(\d+)\s*base/);
    const km = s.match(/₹\s*(\d+)\s*\/\s*km/);
    return { base: bm ? Number(bm[1]) : bF, perKm: km ? Number(km[1]) : kF };
  };
  const a = parse(city?.transport.auto, 25, 14);
  const t = parse(city?.transport.taxi, 150, 18);
  const hour = resolveHour(pickupHour);
  return {
    citySlug,
    km,
    pickupHour: hour,
    auto: buildLeg(a.base, a.perKm, km, 1),
    taxi: buildLeg(t.base, t.perKm, km, 1),
    bus: { min: 15, max: 120 },
    surge: 1,
    peak: false,
    nightCharge: false,
    peakMultiplier: DEFAULT_PEAK,
    nightMultiplier: DEFAULT_NIGHT,
    source: "fallback",
    overrideApplied: false,
    fetchedAt: new Date().toISOString(),
    cachedFor: 0,
    note: "Live fare data unavailable — showing static indicative rates.",
  };
}

export const getLiveFare = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        citySlug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
        km: z.number().min(1).max(200),
        pickupHour: z.number().int().min(0).max(23).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<LiveFare> => {
    const key = `${data.citySlug}:${data.km}:${data.pickupHour ?? "now"}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;

    let value: LiveFare;
    try {
      value = await computeLiveFare(data.citySlug, data.km, data.pickupHour);
    } catch (err) {
      console.error("Live fare computation failed:", err);
      value = staticFallback(data.citySlug, data.km, data.pickupHour);
    }

    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  });
