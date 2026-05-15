import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { audiences, cities, regions, type Audience, type Region } from "@/data/cities";

export const Route = createFileRoute("/cities")({
  head: () => ({
    meta: [
      { title: "All Destinations — Travel Bharat" },
      { name: "description", content: "Browse 40+ Indian destinations. Filter by region, vibe, and who you're travelling with." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) || "",
    region: (s.region as Region) || ("" as "" | Region),
    audience: (s.audience as Audience) || ("" as "" | Audience),
  }),
  component: CitiesPage,
});

function CitiesPage() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q || "");
  const [region, setRegion] = useState<"" | Region>(search.region || "");
  const [audience, setAudience] = useState<"" | Audience>(search.audience || "");

  const filtered = useMemo(() => {
    return cities.filter(c => {
      if (q && !`${c.name} ${c.state}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (region && c.region !== region) return false;
      if (audience && !c.audiences.includes(audience)) return false;
      return true;
    });
  }, [q, region, audience]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <span className="eyebrow text-saffron">The Atlas</span>
      <h1 className="display mt-3 text-6xl text-primary md:text-7xl">All of India,<br/><em className="display-italic">in one index.</em></h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{cities.length} destinations and counting. Filter by region or by who's coming with you.</p>

      <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="min-w-48 flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select value={region} onChange={(e) => setRegion(e.target.value as Region | "")} className="rounded-xl bg-secondary px-4 py-2.5 text-sm">
          <option value="">All regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value as Audience | "")} className="rounded-xl bg-secondary px-4 py-2.5 text-sm">
          <option value="">Travelling with anyone</option>
          {audiences.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(q || region || audience) && (
          <button onClick={() => { setQ(""); setRegion(""); setAudience(""); }} className="text-sm text-muted-foreground underline">Clear</button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} place{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Link key={c.slug} to="/cities/$slug" params={{ slug: c.slug }} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={c.hero} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs">{c.region}</div>
            </div>
            <div className="p-5">
              <div className="eyebrow text-teal-deep">{c.state}</div>
              <h3 className="display mt-1 text-3xl text-primary">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.audiences.slice(0, 3).map(a => (
                  <span key={a} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{a}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-20 rounded-3xl border border-dashed border-border p-16 text-center">
          <h3 className="display text-3xl text-primary">No matches.</h3>
          <p className="mt-2 text-muted-foreground">Try clearing a filter — or ask us on WhatsApp.</p>
        </div>
      )}
    </div>
  );
}
