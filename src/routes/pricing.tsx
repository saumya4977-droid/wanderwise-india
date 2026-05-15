import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Travel Bharat" },
      { name: "description", content: "Subscribe to Travel Bharat. ₹199 for one place, ₹299 for two, ₹799 for all of India." },
      { property: "og:title", content: "Travel Bharat — Pricing" },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "One Place",
    price: "₹199",
    blurb: "Pick a single destination and unlock everything we know about it.",
    features: [
      "1 destination of your choice",
      "Live weather & best-season guide",
      "All transport fares + calculator",
      "Stay options across all budgets",
      "Audience-filtered places",
      "WhatsApp support",
    ],
    accent: "teal-deep",
    cta: "Choose one place",
  },
  {
    name: "Two Places",
    price: "₹299",
    blurb: "Planning a multi-stop trip? Get two destinations, both fully decoded.",
    features: [
      "2 destinations of your choice",
      "Everything in One Place",
      "Side-by-side comparisons",
      "Cross-city transport options",
      "Priority WhatsApp replies",
    ],
    accent: "saffron",
    featured: true,
    cta: "Plan two places",
  },
  {
    name: "All of India",
    price: "₹799",
    blurb: "Every famous and not-so-famous place in India. The whole atlas.",
    features: [
      "All 40+ destinations (and counting)",
      "Everything in Two Places",
      "New cities added monthly",
      "Verified guide directory",
      "Bulk itinerary builder",
    ],
    accent: "indigo",
    cta: "Unlock all of India",
  },
];

export default function _() { return null; }

function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center">
        <span className="eyebrow text-saffron">Subscriptions</span>
        <h1 className="display mt-3 text-6xl text-primary md:text-7xl">Pay for the trip<br/><em className="display-italic">you're actually taking.</em></h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          One place, two places, or every place in India. Pick the plan that fits your itinerary — not someone else's.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-3xl border p-8 ${
              t.featured
                ? "border-saffron bg-card shadow-xl shadow-saffron/10 md:-translate-y-4"
                : "border-border bg-card"
            }`}
          >
            {t.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-saffron px-4 py-1 text-xs font-semibold text-primary">
                Most popular
              </div>
            )}
            <span className={`eyebrow text-${t.accent}`}>{t.name}</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="display text-6xl text-primary">{t.price}</span>
              <span className="text-sm text-muted-foreground">one-time</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t.blurb}</p>

            <ul className="mt-6 space-y-3 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/cities"
              className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-medium ${
                t.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:border-primary"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-20 rounded-3xl border border-border bg-secondary/40 p-10 text-center">
        <span className="eyebrow text-teal-deep">Tourist registration is free</span>
        <h3 className="display mt-3 text-4xl text-primary">Browse before you buy.</h3>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Sign up as a tourist to save destinations, message verified guides, and unlock your subscription.
        </p>
      </div>
    </div>
  );
}
