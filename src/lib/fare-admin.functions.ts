import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface FareOverride {
  id: string;
  city_slug: string;
  auto_base: number | null;
  auto_per_km: number | null;
  taxi_base: number | null;
  taxi_per_km: number | null;
  bus_min: number | null;
  bus_max: number | null;
  peak_multiplier: number | null;
  night_multiplier: number | null;
  updated_at: string;
}

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

export interface AuditEntry {
  id: string;
  city_slug: string;
  action: "upsert" | "delete";
  changed_by: string;
  changed_by_email: string | null;
  before_values: JsonValue | null;
  after_values: JsonValue | null;
  changed_fields: string[] | null;
  created_at: string;
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Failed to verify admin");
  if (!data) throw new Error("Forbidden: admin only");
}

async function getEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown>): string[] {
  const keys = new Set<string>([...Object.keys(after), ...(before ? Object.keys(before) : [])]);
  const changed: string[] = [];
  for (const k of keys) {
    if (k === "id" || k === "updated_at" || k === "created_at" || k === "city_slug") continue;
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (a !== b) changed.push(k);
  }
  return changed;
}

export const listFareOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FareOverride[]> => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("fare_overrides")
      .select("*")
      .order("city_slug");
    if (error) throw new Error(error.message);
    return (data ?? []) as FareOverride[];
  });

// Stricter, business-rule validation. Used for both admin save and API input.
const numField = (max: number) =>
  z
    .number({ invalid_type_error: "Must be a number" })
    .finite("Must be a finite number")
    .nonnegative("Cannot be negative")
    .max(max, `Must be ≤ ${max}`)
    .nullable();

const upsertSchema = z
  .object({
    city_slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Invalid city slug"),
    auto_base: numField(2000),
    auto_per_km: numField(500),
    taxi_base: numField(5000),
    taxi_per_km: numField(500),
    bus_min: numField(1000),
    bus_max: numField(5000),
    peak_multiplier: z
      .number({ invalid_type_error: "Must be a number" })
      .finite()
      .min(1, "Multiplier cannot be < 1×")
      .max(3, "Multiplier cannot exceed 3×")
      .nullable(),
    night_multiplier: z
      .number({ invalid_type_error: "Must be a number" })
      .finite()
      .min(1, "Multiplier cannot be < 1×")
      .max(3, "Multiplier cannot exceed 3×")
      .nullable(),
  })
  .refine(
    (v) => Object.entries(v).some(([k, val]) => k !== "city_slug" && val !== null),
    { message: "Set at least one override value before saving", path: ["auto_base"] },
  )
  .refine(
    (v) => v.bus_min === null || v.bus_max === null || v.bus_min <= v.bus_max,
    { message: "Bus min must be ≤ bus max", path: ["bus_min"] },
  );

export type UpsertInput = z.infer<typeof upsertSchema>;

export const upsertFareOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }): Promise<FareOverride> => {
    await assertAdmin(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("fare_overrides")
      .select("*")
      .eq("city_slug", data.city_slug)
      .maybeSingle();

    const { data: row, error } = await supabaseAdmin
      .from("fare_overrides")
      .upsert(data, { onConflict: "city_slug" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const after = row as Record<string, unknown>;
    const changed = diffFields(existing as Record<string, unknown> | null, after);
    if (changed.length > 0) {
      await supabaseAdmin.from("fare_override_audit").insert({
        city_slug: data.city_slug,
        action: "upsert",
        changed_by: context.userId,
        changed_by_email: await getEmail(context.userId),
        before_values: (existing ?? null) as never,
        after_values: after as never,
        changed_fields: changed,
      });
    }

    return row as FareOverride;
  });

export const deleteFareOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ city_slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("fare_overrides")
      .select("*")
      .eq("city_slug", data.city_slug)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("fare_overrides")
      .delete()
      .eq("city_slug", data.city_slug);
    if (error) throw new Error(error.message);

    if (existing) {
      await supabaseAdmin.from("fare_override_audit").insert({
        city_slug: data.city_slug,
        action: "delete",
        changed_by: context.userId,
        changed_by_email: await getEmail(context.userId),
        before_values: existing as never,
        after_values: null,
        changed_fields: Object.keys(existing).filter(
          (k) => !["id", "city_slug", "created_at", "updated_at"].includes(k),
        ),
      });
    }
    return { ok: true };
  });

export const listAuditEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        city_slug: z.string().max(64).optional(),
        action: z.enum(["upsert", "delete"]).optional(),
        email_query: z.string().max(120).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AuditEntry[]> => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("fare_override_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.city_slug) q = q.eq("city_slug", data.city_slug);
    if (data.action) q = q.eq("action", data.action);
    if (data.email_query) q = q.ilike("changed_by_email", `%${data.email_query}%`);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as AuditEntry[];
  });

const OVERRIDE_FIELDS = [
  "auto_base", "auto_per_km", "taxi_base", "taxi_per_km",
  "bus_min", "bus_max", "peak_multiplier", "night_multiplier",
] as const;

export const revertAuditEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ audit_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; action: "upsert" | "delete" }> => {
    await assertAdmin(context.userId);

    const { data: entry, error: loadErr } = await supabaseAdmin
      .from("fare_override_audit")
      .select("*")
      .eq("id", data.audit_id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!entry) throw new Error("Audit entry not found");

    const citySlug = entry.city_slug as string;
    const before = entry.before_values as Record<string, unknown> | null;

    const { data: current } = await supabaseAdmin
      .from("fare_overrides")
      .select("*")
      .eq("city_slug", citySlug)
      .maybeSingle();

    const email = await getEmail(context.userId);

    if (!before) {
      const { error } = await supabaseAdmin
        .from("fare_overrides")
        .delete()
        .eq("city_slug", citySlug);
      if (error) throw new Error(error.message);
      if (current) {
        await supabaseAdmin.from("fare_override_audit").insert({
          city_slug: citySlug,
          action: "delete",
          changed_by: context.userId,
          changed_by_email: email,
          before_values: current as never,
          after_values: null,
          changed_fields: ["__revert__"],
        });
      }
      return { ok: true, action: "delete" };
    }

    const payload: Record<string, unknown> = { city_slug: citySlug };
    for (const f of OVERRIDE_FIELDS) {
      payload[f] = before[f] ?? null;
    }
    const parsed = upsertSchema.safeParse(payload);
    if (!parsed.success) throw new Error("Cannot revert: previous values fail current validation");

    const { data: row, error } = await supabaseAdmin
      .from("fare_overrides")
      .upsert(parsed.data, { onConflict: "city_slug" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const changed = diffFields(current as Record<string, unknown> | null, row as Record<string, unknown>);
    await supabaseAdmin.from("fare_override_audit").insert({
      city_slug: citySlug,
      action: "upsert",
      changed_by: context.userId,
      changed_by_email: email,
      before_values: (current ?? null) as never,
      after_values: row as never,
      changed_fields: ["__revert__", ...changed],
    });
    return { ok: true, action: "upsert" };
  });

// Re-export for client-side validation
export const upsertFareOverrideSchema = upsertSchema;
