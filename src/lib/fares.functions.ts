import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cityBySlug } from "@/data/cities";

export interface LiveFare {
  citySlug: string;
  km: number;
  auto: { base: number; perKm: number; total: number };
  taxi: { base: number; perKm: number; total: number };
  bus: { min: number; max: number };
  surge: number;
  nightCharge: boolean;
  source: "live" | "provider" | "fallback";
  fetchedAt: string;
  cachedFor: number; // seconds
  note: string;
}

// Per-city base rates (₹). Tuned roughly by metro vs hill vs heritage.
const CITY_RATES: Record<string, { autoBase: number; autoKm: number; taxiBase: number; taxiKm: number; busMin: number; busMax: number }> = {
  mumbai:    { autoBase: 26, autoKm: 17, taxiBase: 160, taxiKm: 20, busMin: 5,  busMax: 50  },
  jaipur:    { autoBase: 25, autoKm: 14, taxiBase: 150, taxiKm: 18, busMin: 10, busMax: 60  },
  ladakh:    { autoBase: 40, autoKm: 22, taxiBase: 250, taxiKm: 28, busMin: 20, busMax: 200 },
  manali:    { autoBase: 30, autoKm: 18, taxiBase: 200, taxiKm: 22, busMin: 15, busMax: 120 },
  varanasi:  { autoBase: 20, autoKm: 12, taxiBase: 140, taxiKm: 16, busMin: 10, busMax: 50  },
};
const DEFAULT_RATES = { autoBase: 25, autoKm: 14, taxiBase: 150, taxiKm: 18, busMin: 15, busMax: 120 };

// In-memory cache (per worker instance). Resets on cold start — fine for stale-tolerant fare estimates.
type CacheEntry = { value: LiveFare; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function computeLiveFare(citySlug: string, km: number): LiveFare {
  const rates = CITY_RATES[citySlug] ?? DEFAULT_RATES;
  const now = new Date();
  // IST hour (UTC+5:30)
  const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;

  // Surge: morning 8-11, evening 17-21
  const isPeak = (istHour >= 8 && istHour < 11) || (istHour >= 17 && istHour < 21);
  // Night charge: 23-05
  const nightCharge = istHour >= 23 || istHour < 5;

  let surge = 1.0;
  if (isPeak) surge = 1.3;
  if (nightCharge) surge = 1.5;

  const autoTotal = Math.round((rates.autoBase + rates.autoKm * km) * surge);
  const taxiTotal = Math.round((rates.taxiBase + rates.taxiKm * km) * surge);

  return {
    citySlug,
    km,
    auto: { base: rates.autoBase, perKm: rates.autoKm, total: autoTotal },
    taxi: { base: rates.taxiBase, perKm: rates.taxiKm, total: taxiTotal },
    bus: { min: rates.busMin, max: rates.busMax },
    surge,
    nightCharge,
    source: "live",
    fetchedAt: now.toISOString(),
    cachedFor: TTL_MS / 1000,
    note: nightCharge
      ? "Night-time surcharge active (11 PM – 5 AM)."
      : isPeak
        ? "Peak-hour surge active — fares are ~30% higher."
        : "Off-peak — standard fares.",
  };
}

async function tryExternalProvider(citySlug: string, km: number): Promise<LiveFare | null> {
  const url = process.env.FARE_PROVIDER_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url}?city=${encodeURIComponent(citySlug)}&km=${km}`, {
      headers: process.env.FARE_PROVIDER_KEY ? { Authorization: `Bearer ${process.env.FARE_PROVIDER_KEY}` } : {},
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Expect provider to return the LiveFare shape; trust but tag the source.
    return { ...data, source: "provider", citySlug, km, fetchedAt: new Date().toISOString(), cachedFor: TTL_MS / 1000 } as LiveFare;
  } catch {
    return null;
  }
}

function staticFallback(citySlug: string, km: number): LiveFare {
  const city = cityBySlug(citySlug);
  const now = new Date().toISOString();
  // Parse "₹150 base + ₹18/km" -> rough numbers; if it fails, use defaults.
  const parse = (s: string | undefined, baseFallback: number, kmFallback: number) => {
    if (!s) return { base: baseFallback, perKm: kmFallback };
    const baseMatch = s.match(/₹\s*(\d+)\s*base/);
    const kmMatch = s.match(/₹\s*(\d+)\s*\/\s*km/);
    return {
      base: baseMatch ? Number(baseMatch[1]) : baseFallback,
      perKm: kmMatch ? Number(kmMatch[1]) : kmFallback,
    };
  };
  const auto = parse(city?.transport.auto, 25, 14);
  const taxi = parse(city?.transport.taxi, 150, 18);
  return {
    citySlug,
    km,
    auto: { ...auto, total: Math.round(auto.base + auto.perKm * km) },
    taxi: { ...taxi, total: Math.round(taxi.base + taxi.perKm * km) },
    bus: { min: 15, max: 120 },
    surge: 1,
    nightCharge: false,
    source: "fallback",
    fetchedAt: now,
    cachedFor: 0,
    note: "Live fare data unavailable — showing static indicative rates from our directory.",
  };
}

export const getLiveFare = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        citySlug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
        km: z.number().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<LiveFare> => {
    const key = `${data.citySlug}:${data.km}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;

    let value: LiveFare;
    try {
      const provider = await tryExternalProvider(data.citySlug, data.km);
      value = provider ?? computeLiveFare(data.citySlug, data.km);
    } catch (err) {
      console.error("Live fare computation failed:", err);
      value = staticFallback(data.citySlug, data.km);
    }

    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  });
