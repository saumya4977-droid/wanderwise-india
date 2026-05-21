import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cities as allCitiesData, type City } from "@/data/cities";
import {
  listFareOverrides,
  upsertFareOverride,
  deleteFareOverride,
  listAuditEntries,
  revertAuditEntry,
  upsertFareOverrideSchema,
  type FareOverride,
  type AuditEntry,
} from "@/lib/fare-admin.functions";

export const Route = createFileRoute("/admin/fares")({
  head: () => ({ meta: [{ title: "Admin · Fare Overrides — Travel Bharat" }] }),
  component: AdminFaresPage,
});

type FormKey =
  | "auto_base" | "auto_per_km"
  | "taxi_base" | "taxi_per_km"
  | "bus_min" | "bus_max"
  | "peak_multiplier" | "night_multiplier";

type FormState = Record<FormKey, string> & { city_slug: string };

const FIELD_KEYS: FormKey[] = [
  "auto_base", "auto_per_km",
  "taxi_base", "taxi_per_km",
  "bus_min", "bus_max",
  "peak_multiplier", "night_multiplier",
];

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
  return Number.isFinite(n) ? n : NaN;
}

function AdminFaresPage() {
  const { user, loading } = useAuth();
  const list = useServerFn(listFareOverrides);
  const upsert = useServerFn(upsertFareOverride);
  const remove = useServerFn(deleteFareOverride);
  const audit = useServerFn(listAuditEntries);
  const revert = useServerFn(revertAuditEntry);
  const qc = useQueryClient();

  const cities = useMemo<City[]>(() => allCitiesData, []);
  const [form, setForm] = useState<FormState>(() => empty(cities[0]?.slug ?? ""));
  const [errors, setErrors] = useState<Partial<Record<FormKey | "form", string>>>({});
  const [msg, setMsg] = useState<string | null>(null);

  // Audit filters
  const [filterCity, setFilterCity] = useState<string>(""); // "" = current form city
  const [filterAction, setFilterAction] = useState<"" | "upsert" | "delete">("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterFrom, setFilterFrom] = useState(""); // YYYY-MM-DD
  const [filterTo, setFilterTo] = useState("");

  const effectiveCitySlug = filterCity || form.city_slug;

  const auditParams = useMemo(() => {
    const p: Record<string, unknown> = { city_slug: effectiveCitySlug, limit: 200 };
    if (filterAction) p.action = filterAction;
    if (filterEmail.trim()) p.email_query = filterEmail.trim();
    if (filterFrom) p.from = new Date(filterFrom + "T00:00:00").toISOString();
    if (filterTo) p.to = new Date(filterTo + "T23:59:59").toISOString();
    return p;
  }, [effectiveCitySlug, filterAction, filterEmail, filterFrom, filterTo]);

  const { data: overrides, isLoading, error } = useQuery({
    queryKey: ["fare-overrides"],
    queryFn: () => list({}),
    enabled: !!user,
  });

  const { data: auditEntries } = useQuery({
    queryKey: ["fare-audit", auditParams],
    queryFn: () => audit({ data: auditParams }),
    enabled: !!user,
  });


  function validate(): { ok: true; values: ReturnType<typeof buildPayload> } | { ok: false } {
    const errs: Partial<Record<FormKey | "form", string>> = {};

    // Local field-level: reject NaN (non-numeric strings)
    for (const k of FIELD_KEYS) {
      const raw = form[k];
      if (raw.trim() === "") continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) errs[k] = "Not a number";
      else if (n < 0) errs[k] = "Cannot be negative";
    }

    if (Object.keys(errs).length === 0) {
      const payload = buildPayload(form);
      const parsed = upsertFareOverrideSchema.safeParse(payload);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const path = issue.path[0] as FormKey | undefined;
          if (path) errs[path] = issue.message;
          else errs.form = issue.message;
        }
      } else {
        setErrors({});
        return { ok: true, values: payload };
      }
    }
    setErrors(errs);
    return { ok: false };
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const v = validate();
      if (!v.ok) return Promise.reject(new Error("Fix validation errors first"));
      return upsert({ data: v.values });
    },
    onSuccess: () => {
      setMsg("Saved.");
      qc.invalidateQueries({ queryKey: ["fare-overrides"] });
      qc.invalidateQueries({ queryKey: ["fare-audit"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => remove({ data: { city_slug: slug } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fare-overrides"] });
      qc.invalidateQueries({ queryKey: ["fare-audit"] });
    },
  });

  const revertMut = useMutation({
    mutationFn: (audit_id: string) => revert({ data: { audit_id } }),
    onSuccess: (r) => {
      setMsg(r.action === "delete" ? "Reverted — override removed." : "Reverted to previous values.");
      qc.invalidateQueries({ queryKey: ["fare-overrides"] });
      qc.invalidateQueries({ queryKey: ["fare-audit"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  function exportAuditCsv() {
    const rows = auditEntries ?? [];
    const header = ["created_at","city_slug","action","changed_by_email","changed_by","changed_fields","before_values","after_values"];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      header.join(","),
      ...rows.map((r) => [r.created_at, r.city_slug, r.action, r.changed_by_email, r.changed_by, r.changed_fields, r.before_values, r.after_values].map(esc).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `fare-audit-${effectiveCitySlug}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  useEffect(() => {
    const o = overrides?.find((x) => x.city_slug === form.city_slug);
    setErrors({});
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
  const hasOverride = overrides?.some((o) => o.city_slug === form.city_slug);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <span className="eyebrow text-saffron">Operations</span>
      <h1 className="display mt-2 text-5xl text-primary">Fare overrides</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Override per-city base rates and surge multipliers. Empty fields fall back to built-in defaults.
        Multipliers must be between 1× and 3×. Changes take effect within ~60 seconds.
      </p>

      {isForbidden && (
        <div className="mt-8 rounded-2xl border border-saffron/40 bg-saffron/10 p-5 text-sm">
          You're signed in but not an admin. Ask an existing admin to grant the <code>admin</code> role in <code>user_roles</code>.
        </div>
      )}

      {!isForbidden && (
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
              <Field label="Auto base ₹" min={0} max={2000} k="auto_base" form={form} setForm={setForm} err={errors.auto_base} placeholder="25" />
              <Field label="Auto ₹/km"   min={0} max={500}  k="auto_per_km" form={form} setForm={setForm} err={errors.auto_per_km} placeholder="14" />
              <Field label="Taxi base ₹" min={0} max={5000} k="taxi_base" form={form} setForm={setForm} err={errors.taxi_base} placeholder="150" />
              <Field label="Taxi ₹/km"   min={0} max={500}  k="taxi_per_km" form={form} setForm={setForm} err={errors.taxi_per_km} placeholder="18" />
              <Field label="Bus min ₹"   min={0} max={1000} k="bus_min" form={form} setForm={setForm} err={errors.bus_min} placeholder="15" />
              <Field label="Bus max ₹"   min={0} max={5000} k="bus_max" form={form} setForm={setForm} err={errors.bus_max} placeholder="120" />
              <Field label="Peak × (1–3)"  min={1} max={3} step={0.05} k="peak_multiplier" form={form} setForm={setForm} err={errors.peak_multiplier} placeholder="1.3" />
              <Field label="Night × (1–3)" min={1} max={3} step={0.05} k="night_multiplier" form={form} setForm={setForm} err={errors.night_multiplier} placeholder="1.5" />
            </div>

            {errors.form && (
              <p className="mt-4 rounded-lg border border-saffron/40 bg-saffron/10 p-3 text-xs text-saffron">{errors.form}</p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={saveMut.isPending}
                className="rounded-full bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saveMut.isPending ? "Saving…" : "Save override"}
              </button>
              {hasOverride && (
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

          <div className="md:col-span-5 space-y-8">
            <div>
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

            <div>
              <span className="eyebrow text-saffron">Audit log · {form.city_slug}</span>
              <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
                {auditEntries?.length === 0 && <p className="text-xs text-muted-foreground">No changes recorded yet.</p>}
                {auditEntries?.map((a: AuditEntry) => (
                  <div key={a.id} className="rounded-xl border border-border p-3 text-xs">
                    <div className="flex justify-between">
                      <span className={`font-medium ${a.action === "delete" ? "text-saffron" : "text-primary"}`}>
                        {a.action === "delete" ? "Removed" : "Updated"}
                      </span>
                      <time className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</time>
                    </div>
                    <div className="mt-1 text-muted-foreground">{a.changed_by_email ?? a.changed_by.slice(0, 8) + "…"}</div>
                    {a.changed_fields && a.changed_fields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.changed_fields.map((f) => <span key={f} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{f}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildPayload(form: FormState) {
  return {
    city_slug: form.city_slug,
    auto_base: toNum(form.auto_base),
    auto_per_km: toNum(form.auto_per_km),
    taxi_base: toNum(form.taxi_base),
    taxi_per_km: toNum(form.taxi_per_km),
    bus_min: toNum(form.bus_min),
    bus_max: toNum(form.bus_max),
    peak_multiplier: toNum(form.peak_multiplier),
    night_multiplier: toNum(form.night_multiplier),
  };
}

function Field({
  label, k, form, setForm, err, placeholder, min, max, step,
}: {
  label: string;
  k: FormKey;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  err?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step ?? 0.01}
        min={min}
        max={max}
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-lg border bg-background p-2 ${err ? "border-saffron" : "border-border"}`}
      />
      {err && <span className="mt-1 block text-[11px] text-saffron">{err}</span>}
    </label>
  );
}
