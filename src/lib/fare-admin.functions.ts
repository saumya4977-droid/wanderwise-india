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

const upsertSchema = z.object({
  city_slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  auto_base: z.number().min(0).max(2000).nullable(),
  auto_per_km: z.number().min(0).max(500).nullable(),
  taxi_base: z.number().min(0).max(5000).nullable(),
  taxi_per_km: z.number().min(0).max(500).nullable(),
  bus_min: z.number().min(0).max(1000).nullable(),
  bus_max: z.number().min(0).max(5000).nullable(),
  peak_multiplier: z.number().min(1).max(5).nullable(),
  night_multiplier: z.number().min(1).max(5).nullable(),
});

export const upsertFareOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }): Promise<FareOverride> => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("fare_overrides")
      .upsert(data, { onConflict: "city_slug" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as FareOverride;
  });

export const deleteFareOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ city_slug: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("fare_overrides")
      .delete()
      .eq("city_slug", data.city_slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
