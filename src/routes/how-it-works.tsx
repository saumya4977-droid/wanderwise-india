import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Travel Bharat" },
      { name: "description", content: "Search a city, decode it across weather, places, transport and stay — then book directly with our partners." },
    ],
  }),
  component: HowPage,
});

const steps = [
  ["01", "Search a city", "Type any place in India, or tap a quick pick. We cover the famous and the forgotten."],
  ["02", "Open four chapters", "Weather. Places. Transport. Stay. Each one is honest, current, and useful."],
  ["03", "Filter for your people", "Travelling with kids? Elders? Students? Filter every page for who's coming with you."],
  ["04", "Book in one tap", "RedBus, IRCTC, MakeMyTrip, OYO, Booking.com — all linked, no copy-paste."],
  ["05", "Talk to a real human", "Stuck? WhatsApp our team or a verified local guide. Always-on support."],
];

function HowPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <span className="eyebrow text-saffron">How it works</span>
      <h1 className="display mt-3 text-6xl text-primary md:text-7xl">Five steps,<br/><em className="display-italic">one good trip.</em></h1>

      <div className="mt-16 space-y-px overflow-hidden rounded-3xl border border-border bg-border">
        {steps.map(([n, t, d]) => (
          <div key={n} className="grid grid-cols-12 gap-6 bg-card p-8 md:p-12">
            <div className="col-span-12 md:col-span-3">
              <span className="display text-6xl text-saffron">{n}</span>
            </div>
            <div className="col-span-12 md:col-span-9">
              <h2 className="display text-4xl text-primary">{t}</h2>
              <p className="mt-3 text-muted-foreground">{d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 flex justify-center">
        <Link to="/cities" className="rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Browse all destinations →
        </Link>
      </div>
    </div>
  );
}
