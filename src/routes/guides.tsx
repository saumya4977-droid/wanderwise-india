import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/guides")({
  head: () => ({
    meta: [
      { title: "For Local Guides — Travel Bharat" },
      { name: "description", content: "Register as a verified local guide on Travel Bharat. Reach travellers actively planning trips to your city." },
    ],
  }),
  component: GuidesPage,
});

function GuidesPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-16 md:grid-cols-2">
        <div>
          <span className="eyebrow text-saffron">For local guides</span>
          <h1 className="display mt-3 text-6xl text-primary md:text-7xl">Show them<br/><em className="display-italic">your city.</em></h1>
          <p className="mt-5 text-muted-foreground">
            Travel Bharat connects verified local guides with travellers who are actively planning a trip — not idly browsing. List yourself, set your rates, and we'll send you matched requests.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Verified profile with reviews",
              "Direct WhatsApp inquiries",
              "Set your own rates and availability",
              "Featured in your city's destination page",
              "Free to register — we take a small per-booking fee",
            ].map(f => (
              <li key={f} className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          {submitted ? (
            <div className="py-12 text-center">
              <span className="eyebrow text-teal-deep">Received</span>
              <h3 className="display mt-3 text-4xl text-primary">We'll be in touch.</h3>
              <p className="mt-3 text-muted-foreground">Our team will WhatsApp you within 48 hours to verify and onboard.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-4"
            >
              <h2 className="display text-3xl text-primary">Register as a guide</h2>
              <Field label="Full name" required><input required className="input" /></Field>
              <Field label="WhatsApp number" required><input required type="tel" className="input" /></Field>
              <Field label="City you guide in" required><input required className="input" placeholder="e.g. Varanasi" /></Field>
              <Field label="Languages you speak"><input className="input" placeholder="Hindi, English, Bhojpuri" /></Field>
              <Field label="A line about your style">
                <textarea rows={3} className="input" placeholder="e.g. Quiet morning walks through the old ghats, focused on history & food." />
              </Field>
              <button className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Apply to be a guide
              </button>
              <style>{`
                .input { width: 100%; border-radius: 12px; background: oklch(0.94 0.012 90); padding: 10px 14px; outline: none; font-size: 14px; }
                .input:focus { box-shadow: 0 0 0 2px var(--ring); }
              `}</style>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="eyebrow mb-1.5 text-muted-foreground">{label}{required && <span className="text-saffron"> *</span>}</div>
      {children}
    </label>
  );
}
