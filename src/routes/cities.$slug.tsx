import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { audiences, cityBySlug, type Audience, type City } from "@/data/cities";
import { getLiveFare, type FareLeg } from "@/lib/fares.functions";

export const Route = createFileRoute("/cities/$slug")({
  loader: ({ params }): { city: City } => {
    const city = cityBySlug(params.slug);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.city.name} — Travel Bharat` },
          { name: "description", content: `${loaderData.city.tagline}. Weather, places, fares and stays in ${loaderData.city.name}, ${loaderData.city.state}.` },
          { property: "og:title", content: `${loaderData.city.name} · Travel Bharat` },
          { property: "og:description", content: loaderData.city.tagline },
          { property: "og:image", content: loaderData.city.hero },
        ]
      : [],
  }),
  component: CityPage,
});

type Tab = "Weather" | "Places" | "Transport" | "Stay";
const tabs: Tab[] = ["Weather", "Places", "Transport", "Stay"];

function CityPage() {
  const { city } = Route.useLoaderData() as { city: City };
  const [tab, setTab] = useState<Tab>("Weather");
  const [audience, setAudience] = useState<"" | Audience>("");
  const [km, setKm] = useState(8);
  const [pickupHour, setPickupHour] = useState<number | "now">("now");

  const placesFiltered = useMemo(
    () => audience ? city.places.filter(p => p.audiences.includes(audience)) : city.places,
    [city, audience]
  );

  const fetchFare = useServerFn(getLiveFare);
  const { data: liveFare, isFetching: fareLoading, isError: fareError, refetch: refetchFare } = useQuery({
    queryKey: ["fare", city.slug, km, pickupHour],
    queryFn: () => fetchFare({ data: { citySlug: city.slug, km, ...(pickupHour !== "now" ? { pickupHour } : {}) } }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: tab === "Transport",
  });

  const taxiFare = liveFare?.taxi.total ?? 150 + km * 18;
  const autoFare = liveFare?.auto.total ?? 25 + km * 14;

  return (
    <article>
      {/* Cover */}
      <header className="relative h-[70vh] min-h-[480px] overflow-hidden">
        <img src={city.hero} alt={city.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-background" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-12">
          <Link to="/cities" className="eyebrow text-saffron-soft hover:text-white">← All destinations</Link>
          <span className="eyebrow mt-3 text-saffron-soft">{city.region} India · {city.state}</span>
          <h1 className="display mt-2 text-[clamp(3rem,8vw,7rem)] text-white">{city.name}.</h1>
          <p className="mt-3 max-w-xl text-lg text-white/90">{city.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {city.vibe.map((v) => (
              <span key={v} className="rounded-full border border-white/40 px-3 py-1 text-xs text-white">{v}</span>
            ))}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[65px] z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-5 py-4 text-sm transition ${tab === t ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-saffron" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16">
        {tab === "Weather" && (
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <span className="eyebrow text-teal-deep">Right now in {city.name}</span>
              <div className="mt-3 display text-[120px] leading-none text-primary">{city.weather.current.tempC}°</div>
              <div className="text-xl text-muted-foreground">{city.weather.current.condition}</div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Stat label="Humidity" value={`${city.weather.current.humidity}%`} />
                <Stat label="Wind" value={`${city.weather.current.wind} km/h`} />
              </div>
            </div>
            <div className="md:col-span-7">
              <span className="eyebrow text-saffron">Best season to visit</span>
              <h2 className="display mt-3 text-5xl text-primary">{city.weather.best}</h2>
              <p className="mt-4 text-muted-foreground">{city.weather.notes}</p>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Spring", "Mar–May", "Festivals & blooms"],
                  ["Summer", "Jun–Aug", "Hill escapes"],
                  ["Monsoon", "Jul–Sep", "Lush, dramatic"],
                  ["Winter", "Dec–Feb", "Crisp & cultural"],
                ].map(([s, m, n]) => (
                  <div key={s} className="rounded-2xl border border-border p-4">
                    <div className="display text-xl text-primary">{s}</div>
                    <div className="eyebrow text-muted-foreground">{m}</div>
                    <div className="mt-2 text-xs text-muted-foreground">{n}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Places" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow text-saffron">Places worth your time</span>
                <h2 className="display mt-3 text-5xl text-primary">Six picks in {city.name}.</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                <button onClick={() => setAudience("")} className={`rounded-full px-4 py-1.5 text-xs ${audience === "" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Anyone</button>
                {audiences.map(a => (
                  <button key={a} onClick={() => setAudience(a)} className={`rounded-full px-4 py-1.5 text-xs ${audience === a ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {placesFiltered.map((p, i) => (
                <div key={p.name + i} className="rounded-2xl border border-border bg-card p-6">
                  <div className="eyebrow text-teal-deep">{p.category}</div>
                  <h3 className="display mt-2 text-2xl text-primary">{p.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.audiences.map(a => <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{a}</span>)}
                  </div>
                </div>
              ))}
              {placesFiltered.length === 0 && (
                <p className="text-muted-foreground">No matches for that group — try another filter.</p>
              )}
            </div>
          </div>
        )}

        {tab === "Transport" && (
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow text-teal-deep">
                  {liveFare?.source === "live" && "● Live · updated just now"}
                  {liveFare?.source === "provider" && "● Live · provider feed"}
                  {liveFare?.source === "fallback" && "○ Cached fallback"}
                  {!liveFare && "Real fares · Live indications"}
                </span>
                <button
                  onClick={() => refetchFare()}
                  disabled={fareLoading}
                  className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {fareLoading ? "Refreshing…" : "↻ Refresh"}
                </button>
              </div>
              <h2 className="display mt-3 text-5xl text-primary">Getting around {city.name}.</h2>

              {liveFare && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {liveFare.surge > 1 && (
                    <span className="rounded-full bg-saffron/15 px-3 py-1 text-saffron">
                      {liveFare.nightCharge ? "Night surcharge" : "Peak surge"} · ×{liveFare.surge.toFixed(1)}
                    </span>
                  )}
                  <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{liveFare.note}</span>
                </div>
              )}
              {fareError && (
                <p className="mt-3 text-xs text-saffron">Couldn't reach the live feed — showing static rates.</p>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Fare label="Auto rickshaw" value={liveFare ? `₹${liveFare.auto.base} base + ₹${liveFare.auto.perKm}/km` : city.transport.auto} />
                <Fare label="City / AC bus" value={liveFare ? `₹${liveFare.bus.min}–₹${liveFare.bus.max}` : city.transport.bus} />
                <Fare label="Taxi (cab)" value={liveFare ? `₹${liveFare.taxi.base} base + ₹${liveFare.taxi.perKm}/km` : city.transport.taxi} />
                <Fare label="Flights from" value={city.transport.flightFrom ?? "—"} />
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                <span className="eyebrow text-saffron">Fare calculator · {km} km</span>
                <div className="mt-3 flex items-center gap-4">
                  <input type="range" min={1} max={50} value={km} onChange={(e) => setKm(Number(e.target.value))} className="flex-1 accent-[oklch(0.46_0.10_200)]" />
                  <div className="display text-2xl text-primary">{km} km</div>
                </div>

                <div className="mt-5">
                  <span className="eyebrow text-teal-deep">Pickup time</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setPickupHour("now")}
                      className={`rounded-full px-3 py-1 text-xs ${pickupHour === "now" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      Now
                    </button>
                    {[6, 9, 13, 18, 22, 1].map((h) => (
                      <button
                        key={h}
                        onClick={() => setPickupHour(h)}
                        className={`rounded-full px-3 py-1 text-xs ${pickupHour === h ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                      >
                        {h.toString().padStart(2, "0")}:00
                      </button>
                    ))}
                    <select
                      value={pickupHour === "now" ? "" : pickupHour}
                      onChange={(e) => setPickupHour(e.target.value === "" ? "now" : Number(e.target.value))}
                      className="rounded-full bg-secondary px-3 py-1 text-xs"
                    >
                      <option value="">Custom hour…</option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <FareBreakdown title="Auto rickshaw" leg={liveFare?.auto} fallback={autoFare} loading={fareLoading} surge={liveFare?.surge ?? 1} />
                  <FareBreakdown title="Taxi (cab)" leg={liveFare?.taxi} fallback={taxiFare} loading={fareLoading} surge={liveFare?.surge ?? 1} />
                </div>

                {liveFare && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Pickup hour {liveFare.pickupHour.toString().padStart(2, "0")}:00 IST · {liveFare.peak ? "peak" : liveFare.nightCharge ? "night" : "off-peak"} · refreshes every 60s · source: {liveFare.source}{liveFare.overrideApplied ? " · admin override" : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="md:col-span-5">
              <span className="eyebrow text-teal-deep">Book in one tap</span>
              <div className="mt-3 space-y-3">
                {[
                  ["RedBus", "Buses across India", "https://www.redbus.in/"],
                  ["IRCTC", "Train tickets", "https://www.irctc.co.in/"],
                  ["MakeMyTrip", "Flights & buses", "https://www.makemytrip.com/"],
                ].map(([name, desc, url]) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary">
                    <div>
                      <div className="display text-2xl text-primary">{name}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                    <span className="text-saffron">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Stay" && (
          <div>
            <span className="eyebrow text-saffron">Where to sleep</span>
            <h2 className="display mt-3 text-5xl text-primary">Budget to luxe in {city.name}.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <StayCard tier="Budget" data={city.stay.budget} accent="teal" />
              <StayCard tier="Mid-range" data={city.stay.mid} accent="indigo" />
              <StayCard tier="Luxury" data={city.stay.luxury} accent="saffron" />
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              {[
                ["MakeMyTrip", "https://www.makemytrip.com/hotels/"],
                ["OYO", "https://www.oyorooms.com/"],
                ["Booking.com", "https://www.booking.com/"],
              ].map(([n, u]) => (
                <a key={n} href={u} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm hover:border-primary">
                  Book on {n} →
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="eyebrow text-muted-foreground">{label}</div>
      <div className="display mt-1 text-3xl text-primary">{value}</div>
    </div>
  );
}
function Fare({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="eyebrow text-teal-deep">{label}</div>
      <div className="display mt-2 text-2xl text-primary">{value}</div>
    </div>
  );
}
function StayCard({ tier, data, accent }: { tier: string; data: { name: string; price: string }; accent: "teal" | "indigo" | "saffron" }) {
  const colorClass = accent === "saffron" ? "text-saffron" : accent === "teal" ? "text-teal-deep" : "text-primary";
  return (
    <div className="rounded-3xl border border-border bg-card p-7">
      <span className={`eyebrow ${colorClass}`}>{tier}</span>
      <h3 className="display mt-2 text-3xl text-primary">{data.name}</h3>
      <div className="mt-3 text-muted-foreground">From</div>
      <div className="display text-4xl text-primary">{data.price}</div>
      <div className="mt-1 text-xs text-muted-foreground">per night, indicative</div>
    </div>
  );
}

function FareBreakdown({ title, leg, fallback, loading, surge }: { title: string; leg: FareLeg | undefined; fallback: number; loading: boolean; surge: number }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-teal-deep">{title}</span>
        {loading && <span className="text-[10px] text-muted-foreground">updating…</span>}
      </div>
      <div className="display mt-1 text-2xl text-primary">₹{leg?.total ?? fallback}</div>
      {leg ? (
        <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          <Row k="Base fare" v={`₹${leg.base}`} />
          <Row k={`Distance · ₹${leg.perKm}/km × ${leg.km} km`} v={`₹${Math.round(leg.perKm * leg.km)}`} />
          <Row k="Subtotal" v={`₹${leg.subtotal}`} />
          {surge > 1 && <Row k={`Surge ×${surge.toFixed(2)}`} v={`+₹${leg.surgeAmount}`} accent />}
          <Row k="Total" v={`₹${leg.total}`} bold />
        </dl>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">Loading live breakdown…</p>
      )}
    </div>
  );
}

function Row({ k, v, accent, bold }: { k: string; v: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-saffron" : ""} ${bold ? "border-t border-border pt-1 font-medium text-foreground" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
