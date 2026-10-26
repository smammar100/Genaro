# API routes

> **Audience:** developers + AI agents
> **Last verified against `main` HEAD:** `86f9d91`

Three server-side route handlers under `src/app/api/`. All run with `runtime: "nodejs"`. All exist to keep secret keys out of the browser.

## `POST /api/dvla/lookup`

Proxies the DVLA Vehicle Enquiry Service v1 with a 60-minute in-memory LRU cache (max 200 entries).

**File:** `src/app/api/dvla/lookup/route.ts`
**Service caller:** `src/lib/services/dvla-service.ts`
**Secret:** `DVLA_API_KEY` (server-only)

### Request

```json
POST /api/dvla/lookup
Content-Type: application/json

{ "registrationNumber": "LU17 JHZ" }
```

The route normalises the registration (strips spaces, uppercases) before forwarding.

### Response (200)

Maps the DVLA response shape to `Partial<Vehicle>`:

```json
{
  "make": "AUDI",
  "model": null,
  "year": 2017,
  "colour": "Silver",
  "fuelType": "petrol",
  "engineSizeCC": 1395,
  "motExpiry": "2027-03-14"
}
```

`model` is **always null** — DVLA VES does not return a model field. Users fill it manually in the arrival form.

### Response codes

| Status | Meaning |
|---|---|
| `200` with JSON body | Vehicle found |
| `200` with `null` body | Vehicle not found at DVLA (cached for repeat misses) |
| `400` | Invalid registration format |
| `429` | DVLA upstream rate-limited (free tier: 5 req/sec, 1000/day) |
| `403` | DVLA API key rejected — rotate the key |
| `500` | `DVLA_API_KEY` not configured |
| `502` | DVLA upstream unreachable or returned non-JSON |

The client-side service (`dvla-service.ts`) **never throws** — every non-OK response collapses to `null` with a `console.warn`. The arrival form responds by showing the "Manual entry required — DVLA lookup unavailable" inline state. This is why the Next.js dev overlay stays quiet on bad regs.

### Cache

- 60-minute TTL
- Max 200 entries (LRU eviction)
- Keyed by the normalised registration
- Cache hits log `console.debug` only; misses log warnings on 4xx/5xx

### Mock fallback

If the upstream returns 5xx and a `DVLA_MOCK` seed exists for the registration (in `src/lib/services/dvla-service.ts`), the service returns the mock instead of `null`. Keeps demos working when the live DVLA key is missing or revoked.

---

## `POST /api/photo/vehicle`

Generates a vehicle image with the OpenAI Images API and persists it to Supabase
Storage, then returns the stored URL. Reads the vehicle and writes the object
with the service-role client, scoped to the **caller's own company**. Requires the
`photos:process` capability and is rate-limited per user.

(The former `POST /api/photo/generate` data-URL proxy was removed in the
2026-10-26 security audit — it was unused and ungated.)

**File:** `src/app/api/photo/vehicle/route.ts`
**Service callers:** `src/lib/services/photo-service.ts` (prompts) + `photo-storage.ts` (storage)
**Secrets:** `OPENAI_API_KEY` + Supabase service-role key (server-only)

Used by the Photo Processing page (`/advert/photo-processing`).

---

## What's **not** an API route

These are sometimes mistaken for API routes. They're not:

- Page route handlers (`src/app/(dashboard)/**/page.tsx`) — these are React Server Components, not API routes.
- Server actions — the codebase doesn't use Next.js server actions today; mutations go through service files on the client.

## Adding a new API route

1. Create `src/app/api/<group>/<endpoint>/route.ts`.
2. Export `POST` / `GET` / `PATCH` async functions returning `NextResponse.json()`.
3. Add `export const runtime = "nodejs";` if you need Node APIs (default is fine for fetch/json).
4. Add the consumer to `src/lib/services/<entity>-service.ts`.
5. Never reference secret env vars from the browser side — guard them in the route handler.
6. Document the route in this file with the same shape as the three above.
