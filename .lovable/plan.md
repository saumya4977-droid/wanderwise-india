
## 1. Live Weather tab (per city)

- Server fn `getWeather(city_slug)` in `src/lib/weather.functions.ts`:
  - Looks up lat/lon from `src/data/cities.ts` (add coords where missing).
  - Calls Open-Meteo (`api.open-meteo.com/v1/forecast`) — no API key needed.
  - Returns `{ current: {temp, feelsLike, humidity, wind, code}, daily: [7 days], bestSeason }`.
  - 10-min in-memory cache + static-season fallback if the call fails.
- In `src/routes/cities.$slug.tsx` Weather tab:
  - Show current conditions card, 7-day strip, and the existing best-season copy.
  - Loading skeleton + graceful fallback message when live data unavailable.

## 2. Per-city paid access (₹199 / ₹299 / ₹799 via Stripe)

Plans: 1 city = ₹199, 2 cities = ₹299, all cities = ₹799 (one-time, lifetime).

**Backend**
- `recommend_payment_provider` → `enable_stripe_payments` (Lovable-managed Stripe, test mode first).
- Create 3 products via `batch_create_product` after enable: `city_pack_1`, `city_pack_2`, `city_pack_all` (INR, one-time).
- Migration: `city_entitlements` table — `user_id`, `city_slug` (nullable; null = all), `source` (stripe session id), `created_at`. RLS: user can read own; insert only via service role.
- Migration: `pending_city_selection` table — `checkout_session_id`, `user_id`, `plan` (`one|two|all`), `city_slugs text[]`, used to bind chosen cities to the session before webhook fires.
- Webhook server route `/api/public/webhooks/stripe`: on `checkout.session.completed`, verify signature, look up `pending_city_selection`, insert rows into `city_entitlements` (one per city, or single null row for `all`).
- Server fn `getMyEntitlements()` (uses `requireSupabaseAuth`) — returns the set of unlocked slugs / `all`.
- Server fn `createCheckout({ plan, city_slugs })` — validates count matches plan, writes `pending_city_selection`, calls Stripe to create checkout session, returns URL.

**Frontend**
- `src/routes/pricing.tsx` already exists — wire the 3 tiers to a "Choose cities → Pay" flow:
  - Plan 1/2 → modal/page to pick the city slug(s) from `cities.ts`.
  - Plan all → straight to checkout.
- `src/routes/cities.$slug.tsx`: if user isn't entitled to this city, show a Paywall card over the tabs ("Unlock Jaipur for ₹199 or get all cities for ₹799") with CTA to `/pricing?city=<slug>`. Free preview: hero + first PLACES tile remain visible; WEATHER/TRANSPORT/STAY locked.
- `src/routes/checkout.success.tsx` — confirms entitlement, links back to the unlocked city.
- Admins (existing `has_role admin`) bypass paywall.

## 3. UX polish

- `src/components/SiteHeader.tsx`: add `Compare` and (admin-only) `Admin` links.
- `src/routes/compare.tsx`: add a small "How to use" hint + paste-area styling; make the cheapest highlight readable on mobile.
- `src/routes/admin.fares.tsx`: stack the two-column grid on <768px (currently overflows on 651px viewport).
- `src/routes/cities.$slug.tsx`: tabs horizontally scrollable on mobile; fare breakdown cards stack instead of side-by-side.

## Technical notes

- Open-Meteo is keyless; weather caching uses the existing `globalThis`-backed cache pattern used by `fares.functions.ts` (already accepted in the codebase).
- Stripe integration uses Lovable-managed payments — no key entry from the user. After `enable_stripe_payments`, I'll request from you: business name confirmation in the popup form, then implement products/webhook.
- Entitlement check happens server-side in a `requireEntitlement(slug)` helper and also as a UI guard; webhook is the only writer.
- All new server fns return plain DTOs; no rich objects across the RPC boundary.

## Files

**New**: `src/lib/weather.functions.ts`, `src/lib/billing.functions.ts`, `src/routes/api/public/webhooks/stripe.ts`, `src/routes/checkout.success.tsx`, `supabase/migrations/<ts>_entitlements.sql`

**Edited**: `src/routes/cities.$slug.tsx` (weather UI + paywall + mobile), `src/routes/pricing.tsx` (city picker + checkout), `src/components/SiteHeader.tsx` (nav), `src/routes/compare.tsx` (polish), `src/routes/admin.fares.tsx` (responsive), `src/data/cities.ts` (lat/lon)

## Out of scope (ask if you want them)

- Razorpay/UPI (you chose Stripe).
- Going live on Stripe — stays in test mode until you claim the account.
- Recurring monthly plans — plan is one-time lifetime.
