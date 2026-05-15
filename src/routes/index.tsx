import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero-india.jpg";
import { cities, regionImage, regions, type Region } from "@/data/cities";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Travel Bharat — Every place in India, decoded." },
      { name: "description", content: "Real-time weather, fares, stays and trusted guides for 40+ destinations across India. From Manali to Munnar." },
      { property: "og:title", content: "Travel Bharat" },
      { property: "og:description", content: "Plan smarter trips across India." },
    ],
  }),
  component: HomePage,
});

const featuredSlugs = ["udaipur","varanasi","alleppey","ladakh","cherrapunji","manali"];

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = cities.find(c => c.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (match) navigate({ to: "/cities/$slug", params: { slug: match.slug } });
    else navigate({ to: "/cities", search: { q } as never });
  };

  const featured = featuredSlugs.map(s => cities.find(c => c.slug === s)!).filter(Boolean);
  const lead = cities.find(c => c.slug === "udaipur")!;

  return (
    <>
      {/* HERO — magazine cover */}
      <section className="relative">
        <div className="relative h-[88vh] min-h-[600px] w-full overflow-hidden">
          <img src={heroImg} alt="Lake Palace, Udaipur at golden hour" width={1920} height={1080} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-background" />
          <div className="absolute inset-0 grain opacity-60" />
          <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-16">
            <span className="eyebrow text-saffron-soft">Issue 01 · Winter 2026</span>
            <h1 className="display mt-3 max-w-5xl text-balance text-[clamp(3rem,9vw,8rem)] text-white">
              Every place in India,<br/>
              <span className="display-italic text-saffron-soft">decoded.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85">
              Real-time weather. Real fares. Real stays. Real guides.
              From the famous to the forgotten — 40+ destinations, one quiet, beautiful app.
            </p>

            <form onSubmit={onSubmit} className="mt-10 flex w-full max-w-2xl items-center gap-2 rounded-full border border-white/30 bg-background/90 p-2 backdrop-blur">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a city — Manali, Varanasi, Munnar…"
                className="flex-1 bg-transparent px-5 py-3 text-base outline-none placeholder:text-muted-foreground"
              />
              <button className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Decode it →
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {["Jaipur","Goa","Rishikesh","Spiti Valley","Kochi","Shillong"].map((c) => {
                const slug = cities.find(x => x.name === c)?.slug ?? "";
                return (
                  <Link key={c} to="/cities/$slug" params={{ slug }} className="rounded-full border border-white/40 px-3 py-1 text-white/85 hover:bg-white hover:text-primary">
                    {c}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* MAGAZINE GRID — featured */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex items-end justify-between">
          <div>
            <span className="eyebrow text-saffron">The Itinerary</span>
            <h2 className="display mt-3 text-5xl text-primary md:text-6xl">Six places, six moods.</h2>
          </div>
          <Link to="/cities" className="hidden text-sm underline underline-offset-4 hover:text-primary md:inline">See all 40+ →</Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-12">
          {/* Lead story */}
          <Link to="/cities/$slug" params={{ slug: lead.slug }} className="group relative col-span-12 overflow-hidden rounded-3xl md:col-span-7 md:row-span-2">
            <img src={lead.hero} alt={lead.name} loading="lazy" className="h-[520px] w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8">
              <span className="eyebrow text-saffron-soft">{lead.region} India · {lead.state}</span>
              <h3 className="display mt-2 text-5xl text-white">{lead.name}</h3>
              <p className="mt-2 max-w-md text-white/85">{lead.tagline}</p>
            </div>
          </Link>

          {featured.filter(c => c.slug !== lead.slug).map((c, i) => (
            <Link key={c.slug} to="/cities/$slug" params={{ slug: c.slug }}
              className={`group relative col-span-12 overflow-hidden rounded-3xl sm:col-span-6 md:col-span-${i === 0 ? 5 : i === 1 ? 5 : 5}`}>
              <img src={c.hero} alt={c.name} loading="lazy" className="h-64 w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <span className="eyebrow text-saffron-soft">{c.region}</span>
                <h3 className="display mt-1 text-3xl text-white">{c.name}</h3>
                <p className="text-sm text-white/80">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* REGIONS strip */}
      <section className="border-y border-border bg-secondary/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <span className="eyebrow text-teal-deep">By Region</span>
              <h2 className="display mt-3 text-5xl text-primary">All of India,<br/><em className="display-italic text-teal-deep">in five chapters.</em></h2>
              <p className="mt-4 text-muted-foreground">From Himalayan hush to backwater hum — we cover the country end to end.</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {regions.map((r: Region) => (
                <Link key={r} to="/cities" search={{ region: r } as never} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
                  <img src={regionImage[r]} alt={`${r} India`} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="display text-xl text-white">{r}</div>
                    <div className="eyebrow text-white/70">India</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <span className="eyebrow text-saffron">What you'll know before you go</span>
        <h2 className="display mt-3 max-w-3xl text-5xl text-primary md:text-6xl">No guesswork. <em className="display-italic">Just better trips.</em></h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
          {[
            ["01", "Weather", "Live conditions, the season-by-season honest take, and exactly when to go."],
            ["02", "Places", "Filtered by who you're with — kids, elders, students, teachers, youth, families."],
            ["03", "Transport", "Bus, taxi, auto, train and flight fares. RedBus, IRCTC and MakeMyTrip linked."],
            ["04", "Stays", "Budget homestays to luxury resorts. OYO, MakeMyTrip, Booking.com — one tap."],
          ].map(([n, t, d]) => (
            <div key={n} className="bg-card p-8">
              <span className="eyebrow text-teal-deep">{n}</span>
              <h3 className="display mt-3 text-3xl text-primary">{t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GUIDES CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-8 rounded-3xl bg-primary p-10 text-primary-foreground md:grid-cols-2 md:p-16">
          <div>
            <span className="eyebrow text-saffron-soft">For local guides</span>
            <h2 className="display mt-3 text-5xl">Know your city like<br/><em className="display-italic text-saffron-soft">no one else?</em></h2>
            <p className="mt-4 max-w-md text-white/85">
              List yourself on Travel Bharat. Verified guides reach travellers actively planning their trip — kids, elders, students, families. We handle the discovery, you handle the experience.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3">
            <Link to="/guides" className="inline-flex w-fit rounded-full bg-saffron px-6 py-3 text-primary hover:bg-saffron-soft">
              Register as a guide →
            </Link>
            <Link to="/pricing" className="inline-flex w-fit rounded-full border border-white/30 px-6 py-3 text-white hover:bg-white/10">
              Or join as a tourist
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
