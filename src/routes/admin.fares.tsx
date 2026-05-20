import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { allCities } from "@/data/cities";
import { listFareOverrides, upsertFareOverride, deleteFareOverride, type FareOverride } from "@/lib/fare-admin.functions";

export const Route = createFileRoute("/admin/fares")({
  head: () => ({ meta: [{ title: "Admin · Fare Overrides — Travel Bharat" }] }),
  component: AdminFaresPage,
});

type FormState = {
  city_slug: string;
  auto_base: string;
  auto_per_km: string;
  taxi_base: string;
  taxi_per_km: string;
  bus_min: string;
  bus_max: string;
  peak_multiplier: string;
  night_multiplier: string;
};

const empty = (slug: string): FormState => ({
  city_slug: slug,
  auto_base: "", auto_per_km: "",
  taxi_base: "", taxi_per_km: "",
  bus_min: "", bus_max: "",
  peak_multiplier: "", night_multiplier: "",
});

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function AdminFaresPage() {
  const { user, loading } = useAuth();
  const list = useServerFn(listFareOverrides);
  const upsert = useServerFn(upsertFareOverride);
  const remove = useServerFn(deleteFareOverride);
  const qc = useQueryClient();

  const cities = useMemo(() => allCities(), []);
  const [form, setForm] = useState<FormState>(() => empty(cities[0]?.slug ?? ""));
  const [msg, setMsg] = useState<string | null>(null);

  const { data: overrides, isLoading, error } = useQuery({
    queryKey: ["fare-overrides"],
    queryFn: () => list({}),
    enabled: !!user,
  });

  const saveMut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          city_slug: form.city_slug,
          auto_base: toNum(form.auto_base),
          auto_per_km: toNum(form.auto_per_km),
          taxi_base: toNum(form.taxi_base),
          taxi_per_km: toNum(form.taxi_per_km),
          bus_min: toNum(form.bus_min),
          bus_max: toNum(form.bus_max),
          peak_multiplier: toNum(form.peak_multiplier),
          night_multiplier: toNum(form.night_multiplier),
        },
      }),
    onSuccess: () => {
      setMsg("Saved.");
      qc.invalidateQueries({ queryKey: ["fare-overrides"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => remove({ data: { city_slug: slug } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fare-overrides"] }),
  });

  useEffect(() => {
    const o = overrides?.find((x) => x.city_slug === form.city_slug);
    setForm((f) => ({
      ...empty(f.city_slug),
      auto_base: o?.auto_base?.toString() ?? "",
      auto_per_km: o?.auto_per_km?.toString() ?? "",
      taxi_base: o?.taxi_base?.toString() ?? "",
      taxi_per_km: o?.taxi_per_km?.toString() ?? "",
      bus_min: o?.bus_min?.toString() ?? "",
      bus_max: o?.bus_max?.toString() ?? "",
      peak_multiplier: o?.peak_multiplier?.toString() ?? "",
      night_multiplier: o?.night_multiplier?.toString() ?? "",
    }));
  }, [form.city_slug, overrides]);

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-20">Loading…</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="display text-4xl text-primary">Admin · Fare Overrides</h1>
        <p className="mt-4 text-muted-foreground">Sign in with an admin account to continue.</p>
        <Link to="/auth" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  const isForbidden = error instanceof Error && /Forbidden|admin/i.test(error.message);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <span className="eyebrow text-saffron">Operations</span>
      <h1 className="display mt-2 text-5xl text-primary">Fare overrides</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Override per-city base rates and surge multipliers. Empty fields fall back to built-in defaults.
        Changes take effect within ~60 seconds (cache TTL).
      </p>

      {isForbidden && (
        <div className="mt-8 rounded-2xl border border-saffron/40 bg-saffron/10 p-5 text-sm">
          You're signed in but not an admin. Ask an existing admin to grant the <code>admin</code> role in <code>user_roles</code>.
        </div>
      )}

      {!isForbidden && (
        <>
          <div className="mt-10 grid gap-8 md:grid-cols-12">
            <form
              className="md:col-span-7 rounded-2xl border border-border bg-card p-6"
              onSubmit={(e) => { e.preventDefault(); setMsg(null); saveMut.mutate(); }}
            >
              <label className="block text-sm">
                <span className="eyebrow text-teal-deep">City</span>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2"
                  value={form.city_slug}
                  onChange={(e) => setForm((f) => ({ ...f, city_slug: e.target.value }))}
                >
                  {cities.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name} — {c.state}</option>
                  ))}
                </select>
              </label>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Field label="Auto base ₹" value={form.auto_base} onChange={(v) => setForm((f) => ({ ...f, auto_base: v }))} placeholder="25" />
                <Field label="Auto ₹/km"   value={form.auto_per_km} onChange={(v) => setForm((f) => ({ ...f, auto_per_km: v }))} placeholder="14" />
                <Field label="Taxi base ₹" value={form.taxi_base} onChange={(v) => setForm((f) => ({ ...f, taxi_base: v }))} placeholder="150" />
                <Field label="Taxi ₹/km"   value={form.taxi_per_km} onChange={(v) => setForm((f) => ({ ...f, taxi_per_km: v }))} placeholder="18" />
                <Field label="Bus min ₹"   value={form.bus_min} onChange={(v) => setForm((f) => ({ ...f, bus_min: v }))} placeholder="15" />
                <Field label="Bus max ₹"   value={form.bus_max} onChange={(v) => setForm((f) => ({ ...f, bus_max: v }))} placeholder="120" />
                <Field label="Peak ×"      value={form.peak_multiplier} onChange={(v) => setForm((f) => ({ ...f, peak_multiplier: v }))} placeholder="1.3" />
                <Field label="Night ×"     value={form.night_multiplier} onChange={(v) => setForm((f) => ({ ...f, night_multiplier: v }))} placeholder="1.5" />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saveMut.isPending}
                  className="rounded-full bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
                >
                  {saveMut.isPending ? "Saving…" : "Save override"}
                </button>
                {overrides?.some((o) => o.city_slug === form.city_slug) && (
                  <button
                    type="button"
                    onClick={() => deleteMut.mutate(form.city_slug)}
                    className="rounded-full border border-border px-5 py-2 text-sm hover:border-saffron hover:text-saffron"
                  >
                    Remove override
                  </button>
                )}
                {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
              </div>
            </form>

            <div className="md:col-span-5">
              <span className="eyebrow text-teal-deep">Active overrides</span>
              <div className="mt-3 space-y-2">
                {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {overrides?.length === 0 && <p className="text-sm text-muted-foreground">None yet — all cities use defaults.</p>}
                {overrides?.map((o: FareOverride) => (
                  <button
                    key={o.id}
                    onClick={() => setForm((f) => ({ ...f, city_slug: o.city_slug }))}
                    className={`block w-full rounded-xl border p-3 text-left text-sm ${form.city_slug === o.city_slug ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="display text-lg text-primary">{o.city_slug}</div>
                    <div className="text-xs text-muted-foreground">
                      auto ₹{o.auto_base ?? "—"}+{o.auto_per_km ?? "—"}/km · taxi ₹{o.taxi_base ?? "—"}+{o.taxi_per_km ?? "—"}/km · peak ×{o.peak_multiplier ?? "—"} · night ×{o.night_multiplier ?? "—"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border bg-background p-2"
      />
    </label>
  );
}
