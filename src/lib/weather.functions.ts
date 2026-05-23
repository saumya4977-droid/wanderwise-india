import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cityBySlug } from "@/data/cities";

export interface WeatherDay {
  date: string;       // YYYY-MM-DD
  tMax: number;
  tMin: number;
  code: number;
  precipMm: number;
}

export interface LiveWeather {
  citySlug: string;
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windKmh: number;
    code: number;
    condition: string;
  };
  daily: WeatherDay[];
  bestSeason: string;
  fetchedAt: string;
  source: "live" | "fallback";
  note: string;
}

// City coordinates (lat, lon). Cities not listed fall back to a regional centroid.
const COORDS: Record<string, [number, number]> = {
  manali: [32.2432, 77.1892],
  shimla: [31.1048, 77.1734],
  spiti: [32.2461, 78.0349],
  nainital: [29.3919, 79.4542],
  rishikesh: [30.0869, 78.2676],
  auli: [30.5333, 79.5667],
  jaipur: [26.9124, 75.7873],
  udaipur: [24.5854, 73.7125],
  jaisalmer: [26.9157, 70.9083],
  amritsar: [31.6340, 74.8723],
  agra: [27.1767, 78.0081],
  varanasi: [25.3176, 82.9739],
  ladakh: [34.1526, 77.5770],
  baga: [15.5524, 73.7517],
  palolem: [15.0099, 74.0234],
  mumbai: [19.0760, 72.8777],
  lonavala: [18.7546, 73.4062],
  mahabaleshwar: [17.9248, 73.6586],
  munnar: [10.0889, 77.0595],
  alleppey: [9.4981, 76.3388],
  kochi: [9.9312, 76.2673],
  ooty: [11.4102, 76.6950],
  kodaikanal: [10.2381, 77.4892],
  darjeeling: [27.0360, 88.2627],
  gangtok: [27.3314, 88.6138],
  tsomgo: [27.3742, 88.7611],
  shillong: [25.5788, 91.8933],
  cherrapunji: [25.2700, 91.7320],
  khajuraho: [24.8318, 79.9199],
  bandhavgarh: [23.7000, 81.0333],
};

const CODE_LABEL: Record<number, string> = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers", 81: "Heavy showers", 82: "Violent showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Storm w/ hail", 99: "Severe storm",
};

type CacheEntry = { value: LiveWeather; expires: number };
const g = globalThis as unknown as { __weatherCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__weatherCache ?? (g.__weatherCache = new Map());
const TTL_MS = 10 * 60_000;

function fallbackWeather(citySlug: string): LiveWeather {
  const city = cityBySlug(citySlug);
  const c = city?.weather.current;
  return {
    citySlug,
    current: {
      tempC: c?.tempC ?? 22,
      feelsLikeC: c?.tempC ?? 22,
      humidity: c?.humidity ?? 55,
      windKmh: c?.wind ?? 10,
      code: 2,
      condition: c?.condition ?? "Pleasant",
    },
    daily: [],
    bestSeason: city?.weather.best ?? "Oct–Mar",
    fetchedAt: new Date().toISOString(),
    source: "fallback",
    note: "Live weather feed unavailable — showing static seasonal estimate.",
  };
}

export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((input: { citySlug: string }) =>
    z.object({ citySlug: z.string().min(1).max(64) }).parse(input)
  )
  .handler(async ({ data }): Promise<LiveWeather> => {
    const city = cityBySlug(data.citySlug);
    if (!city) return fallbackWeather(data.citySlug);

    const cached = cache.get(data.citySlug);
    if (cached && cached.expires > Date.now()) return cached.value;

    const coords = COORDS[data.citySlug];
    if (!coords) {
      const fb = fallbackWeather(data.citySlug);
      cache.set(data.citySlug, { value: fb, expires: Date.now() + TTL_MS });
      return fb;
    }

    try {
      const [lat, lon] = coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=7`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      const json = (await res.json()) as {
        current: {
          temperature_2m: number;
          apparent_temperature: number;
          relative_humidity_2m: number;
          wind_speed_10m: number;
          weather_code: number;
        };
        daily: {
          time: string[];
          weather_code: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: number[];
        };
      };

      const code = json.current.weather_code;
      const value: LiveWeather = {
        citySlug: data.citySlug,
        current: {
          tempC: Math.round(json.current.temperature_2m),
          feelsLikeC: Math.round(json.current.apparent_temperature),
          humidity: Math.round(json.current.relative_humidity_2m),
          windKmh: Math.round(json.current.wind_speed_10m),
          code,
          condition: CODE_LABEL[code] ?? "—",
        },
        daily: json.daily.time.map((date, i) => ({
          date,
          tMax: Math.round(json.daily.temperature_2m_max[i]),
          tMin: Math.round(json.daily.temperature_2m_min[i]),
          code: json.daily.weather_code[i],
          precipMm: Math.round(json.daily.precipitation_sum[i] * 10) / 10,
        })),
        bestSeason: city.weather.best,
        fetchedAt: new Date().toISOString(),
        source: "live",
        note: "Live · Open-Meteo · cached 10m",
      };
      cache.set(data.citySlug, { value, expires: Date.now() + TTL_MS });
      return value;
    } catch (err) {
      console.error("getWeather failed:", err);
      const fb = fallbackWeather(data.citySlug);
      cache.set(data.citySlug, { value: fb, expires: Date.now() + 60_000 });
      return fb;
    }
  });
